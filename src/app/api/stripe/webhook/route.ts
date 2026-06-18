import { type NextRequest } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  StripeConfigurationError,
  getStripe,
  getStripeMode,
  type StripeMode,
} from "@/lib/stripe";
import { getInvoiceSubscriptionId, syncStripeSubscription } from "@/lib/stripe-subscriptions";
import { jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let stripeMode: StripeMode;
  try {
    stripeMode = getStripeMode();
  } catch (err) {
    if (err instanceof StripeConfigurationError) {
      console.error("[stripe webhook] configuration error:", err.message);
    }
    return jsonError("Webhook設定が完了していません", 503);
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature) return jsonError("Stripe署名がありません", 400);
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is missing");
    return jsonError("Webhook設定が完了していません", 503);
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.warn("[stripe webhook] signature verification failed", err);
    return jsonError("Stripe署名を検証できません", 400);
  }

  const eventMode: StripeMode = event.livemode ? "live" : "test";
  if (eventMode !== stripeMode) {
    console.warn(`[stripe webhook] event mode mismatch: expected ${stripeMode}`);
    return jsonError("WebhookのStripeモードが一致しません", 400);
  }

  const admin = createAdminClient();
  const { error: eventInsertError } = await admin.from("billing_events").insert({
    stripe_event_id: event.id,
    stripe_mode: stripeMode,
    type: event.type,
    payload: event,
  });

  if (eventInsertError?.code === "23505") {
    // The first delivery owns processing. Returning immediately also prevents
    // concurrent Stripe retries from running the same event twice.
    return jsonOk({ received: true, duplicate: true });
  } else if (eventInsertError) {
    console.error("[stripe webhook] failed to log event:", eventInsertError);
    return jsonError("Webhookログの保存に失敗しました", 500);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription(subscription, stripeMode);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object as Stripe.Subscription, stripeMode);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const subscriptionId = getInvoiceSubscriptionId(event.data.object as Stripe.Invoice);
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription(subscription, stripeMode);
        }
        break;
      }
    }

    await admin
      .from("billing_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id)
      .eq("stripe_mode", stripeMode);
    return jsonOk({ received: true });
  } catch (err) {
    console.error(`[stripe webhook] failed to process ${event.id}:`, err);
    // Release the idempotency claim so Stripe's next retry can process it.
    // Subscription upserts are themselves idempotent if a partial run occurred.
    const { error: releaseError } = await admin
      .from("billing_events")
      .delete()
      .eq("stripe_event_id", event.id)
      .eq("stripe_mode", stripeMode)
      .is("processed_at", null);
    if (releaseError) {
      console.error(`[stripe webhook] failed to release ${event.id}:`, releaseError);
    }
    return jsonError("Webhookの処理に失敗しました", 500);
  }
}
