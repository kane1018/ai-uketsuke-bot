import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/billing";
import {
  StripeConfigurationError,
  getAppUrl,
  getPriceId,
  getStripe,
  normalizePlan,
} from "@/lib/stripe";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

const checkoutSchema = z.object({ plan: z.enum(["light", "standard", "pro"]) });

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const input = checkoutSchema.parse(await request.json());
    const plan = normalizePlan(input.plan);
    if (!plan) return jsonError("プランが正しくありません", 422);

    const stripe = getStripe();
    const priceId = getPriceId(plan);
    const existing = await getSubscription(user.id);

    if (
      existing?.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(existing.status)
    ) {
      return jsonError(
        "現在の契約は請求管理画面から変更してください",
        409,
        { portalRequired: true }
      );
    }

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "none",
        },
        { onConflict: "user_id" }
      );
      if (error) throw new Error(`Failed to save Stripe customer: ${error.message}`);
    }

    const appUrl = getAppUrl(request.nextUrl.origin);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: false,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    if (!session.url) return jsonError("Checkout URLを作成できませんでした", 502);
    return jsonOk({ url: session.url });
  } catch (err) {
    if (err instanceof StripeConfigurationError) {
      console.error("[stripe checkout] configuration error:", err.message);
      return jsonError("決済設定が完了していません。管理者にお問い合わせください。", 503);
    }
    return handleRouteError(err);
  }
}
