import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/billing";
import { StripeConfigurationError, getAppUrl, getStripe } from "@/lib/stripe";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const subscription = await getSubscription(user.id);
    if (!subscription?.stripe_customer_id) {
      return jsonError("請求情報がまだありません", 404);
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(request.nextUrl.origin);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
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
