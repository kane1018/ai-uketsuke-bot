import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { hasPendingLegalBusinessInfo } from "@/lib/legal-info";
import {
  StripeConfigurationError,
  getAppUrl,
  getPriceId,
  getStripe,
  getStripeMode,
  normalizePlan,
} from "@/lib/stripe";
import {
  clearStripeBillingIdentity,
  createStripeCustomerForUser,
  getValidStripeCustomerId,
} from "@/lib/stripe-customer";
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
    if (stripeMode === "live" && hasPendingLegalBusinessInfo()) {
      return jsonError(
        "本番決済に必要な事業者情報が未設定です。管理者にお問い合わせください。",
        503
      );
    }

    const priceId = getPriceId(plan);
    const selectedPlan = PLANS[plan];
    const effectivePlan = await getEffectivePlan(user.id);
    const existing = effectivePlan.subscription;

    if (plan === "light" && effectivePlan.accessSource === "light_trial") {
      return jsonError(
        "ライトプランの30日無料体験中です。自動課金はされません。無料体験終了後、継続する場合にライトプランへお申し込みください。",
        409,
        {
          trialActive: true,
          trialEndsAt: effectivePlan.trial.endsAt,
        }
      );
    }

    const validCustomerId = await getValidStripeCustomerId(
      existing?.stripe_customer_id
    );
    const staleCustomer = Boolean(
      existing?.stripe_customer_id && !validCustomerId
    );

    if (staleCustomer) {
      // Stripe customer IDs are account-scoped. When the application moves to
      // a different Stripe account, an ID saved by the previous account must
      // not block checkout or be reused against the new account.
      await clearStripeBillingIdentity(user.id, stripeMode);
    }

    if (
      !staleCustomer &&
      existing?.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(existing.status)
    ) {
      return jsonError(
        "現在の契約は請求管理画面から変更してください",
        409,
        { portalRequired: true }
      );
    }

    let customerId = validCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomerForUser({
        userId: user.id,
        email: user.email,
        stripeMode,
      });
    }

    const appUrl = getAppUrl(request.nextUrl.origin);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      branding_settings: {
        // Keep the hosted Checkout header explicit even on a dedicated Stripe account.
        display_name: "受付Bot",
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: false,
      custom_text: {
        submit: {
          message:
            `${selectedPlan.name}プランは月額${selectedPlan.price.toLocaleString()}円、1か月ごとの自動更新です。12か月継続した場合の支払総額の目安は${(selectedPlan.price * 12).toLocaleString()}円です。初回は申込時、その後は各請求期間の開始時に決済します。次回更新日前までに請求管理画面から解約でき、解約手数料はありません。利用者都合による支払済み料金の日割り・返金は原則行いません。`,
        },
      },
      metadata: { user_id: user.id, plan, stripe_mode: stripeMode },
      subscription_data: {
        metadata: { user_id: user.id, plan, stripe_mode: stripeMode },
      },
    });

    if (!session.url) {
      return jsonError("Checkout URLを作成できませんでした", 502);
    }
    return jsonOk({ url: session.url });
  } catch (err) {
    if (err instanceof StripeConfigurationError) {
      console.error("[stripe checkout] configuration error:", err.message);
      return jsonError(
        "決済設定が完了していません。管理者にお問い合わせください。",
        503
      );
    }
    return handleRouteError(err);
  }
}
