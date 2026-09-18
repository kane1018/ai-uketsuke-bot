import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import {
  StripeConfigurationError,
  getAppUrl,
  getPriceId,
  getStripe,
  getStripeMode,
  normalizePlan,
} from "@/lib/stripe";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

const checkoutSchema = z.object({ plan: z.enum(["light", "standard", "pro"]) });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const input = checkoutSchema.parse(await request.json());
    const plan = normalizePlan(input.plan);
    if (!plan) return jsonError("プランが正しくありません", 422);

    const stripe = getStripe();
    const stripeMode = getStripeMode();
    const priceId = getPriceId(plan);
    const selectedPlan = PLANS[plan];
    const existing = await getSubscription(user.id, stripeMode);

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
        metadata: { user_id: user.id, stripe_mode: stripeMode },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_mode: stripeMode,
          stripe_customer_id: customerId,
          plan: "free",
          status: "none",
        },
        { onConflict: "user_id,stripe_mode" }
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
      custom_text: {
        submit: {
          message:
            `${selectedPlan.name}プランは月額${selectedPlan.price.toLocaleString()}円、1か月ごとの自動更新です。初回は申込時、その後は各請求期間の開始時に決済します。次回更新日前までに請求管理画面から解約でき、解約手数料はありません。利用者都合による支払済み料金の日割り・返金は原則行いません。`,
        },
      },
      metadata: { user_id: user.id, plan, stripe_mode: stripeMode },
      subscription_data: {
        metadata: { user_id: user.id, plan, stripe_mode: stripeMode },
      },
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
