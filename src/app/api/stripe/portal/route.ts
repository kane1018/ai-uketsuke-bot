import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/billing";
import {
  StripeConfigurationError,
  getAppUrl,
  getStripe,
  getStripeMode,
} from "@/lib/stripe";
import {
  clearStripeBillingIdentity,
  getValidStripeCustomerId,
} from "@/lib/stripe-customer";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { ensureStripePortalConfiguration } from "@/lib/stripe-portal";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const stripeMode = getStripeMode();
    const subscription = await getSubscription(user.id, stripeMode);
    if (!subscription?.stripe_customer_id) {
      return jsonError("請求情報がまだありません", 404);
    }

    const customerId = await getValidStripeCustomerId(
      subscription.stripe_customer_id
    );
    if (!customerId) {
      await clearStripeBillingIdentity(user.id, stripeMode);
      return jsonError(
        "請求情報が現在の決済アカウントにありません。料金プランから再度お申し込みください。",
        404
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(request.nextUrl.origin);
    const portalConfigurationId = await ensureStripePortalConfiguration(appUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/billing`,
      configuration: portalConfigurationId,
    });
    return jsonOk({ url: session.url });
  } catch (err) {
    if (err instanceof StripeConfigurationError) {
      console.error("[stripe portal] configuration error:", err.message);
      return jsonError("決済設定が完了していません。", 503);
    }
    return handleRouteError(err);
  }
}
