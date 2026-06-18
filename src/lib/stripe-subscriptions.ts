import "server-only";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanFromPriceId, normalizeSubscriptionStatus } from "@/lib/stripe";

function idOf(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan = getPlanFromPriceId(priceId);
  const customerId = idOf(subscription.customer);

  let userId = subscription.metadata.user_id || null;
  if (!userId && customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  if (!userId) throw new Error(`No user is associated with Stripe subscription ${subscription.id}`);
  if (!plan) throw new Error(`Unknown Stripe price ${priceId ?? "(missing)"}`);

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan,
      status: normalizeSubscriptionStatus(subscription.status),
      current_period_start: item?.current_period_start
        ? new Date(item.current_period_start * 1000).toISOString()
        : null,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  if (legacy) return idOf(legacy);

  const parent = invoice.parent;
  if (parent?.type === "subscription_details") {
    return idOf(parent.subscription_details?.subscription);
  }
  return null;
}
