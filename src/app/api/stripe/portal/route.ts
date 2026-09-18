import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/billing";
import {
  StripeConfigurationError,
  getAppUrl,
  getStripe,
  getStripeMode,
} from "@/lib/stripe";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

const PORTAL_HEADLINE = "AI受付Bot 契約管理";
let portalConfigurationPromise: Promise<string> | null = null;

async function getPortalConfigurationId(appUrl: string) {
  const configured = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (configured) return configured;

  if (!portalConfigurationPromise) {
    portalConfigurationPromise = (async () => {
      const stripe = getStripe();
      const privacyPolicyUrl = `${appUrl}/privacy`;
      const termsOfServiceUrl = `${appUrl}/terms`;
      const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
      const existing = configs.data.find(
        (config) =>
          config.active &&
          config.business_profile.headline === PORTAL_HEADLINE &&
          config.business_profile.privacy_policy_url === privacyPolicyUrl &&
          config.business_profile.terms_of_service_url === termsOfServiceUrl
      );
      if (existing) return existing.id;

      const created = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: PORTAL_HEADLINE,
          privacy_policy_url: privacyPolicyUrl,
          terms_of_service_url: termsOfServiceUrl,
        },
        default_return_url: `${appUrl}/dashboard/billing`,
        features: {
          customer_update: {
            enabled: true,
            allowed_updates: ["name", "email", "address", "phone"],
          },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            proration_behavior: "none",
          },
          subscription_update: { enabled: false },
        },
      });
      return created.id;
    })().catch((error) => {
      portalConfigurationPromise = null;
      throw error;
    });
  }

  return portalConfigurationPromise;
}

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

    const stripe = getStripe();
    const appUrl = getAppUrl(request.nextUrl.origin);
    const portalConfigurationId = await getPortalConfigurationId(appUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
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
