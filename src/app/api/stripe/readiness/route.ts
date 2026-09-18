import { type NextRequest } from "next/server";
import { jsonOk } from "@/lib/api";
import { PLANS } from "@/lib/plans";
import {
  StripeConfigurationError,
  getAppUrl,
  getPriceId,
  getStripe,
  getStripeMode,
} from "@/lib/stripe";
import { ensureStripePortalConfiguration } from "@/lib/stripe-portal";

export const dynamic = "force-dynamic";

const PAID_PLAN_IDS = ["light", "standard", "pro"] as const;
const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
] as const;

export async function GET(request: NextRequest) {
  try {
    const mode = getStripeMode();
    const stripe = getStripe();
    const appUrl = getAppUrl(request.nextUrl.origin);
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";

    const priceChecks = await Promise.all(
      PAID_PLAN_IDS.map(async (plan) => {
        const price = await stripe.prices.retrieve(getPriceId(plan));
        const ok =
          price.livemode &&
          price.active &&
          price.currency === "jpy" &&
          price.unit_amount === PLANS[plan].price &&
          price.recurring?.interval === "month" &&
          price.recurring.interval_count === 1;
        return [plan, ok] as const;
      })
    );

    const portalConfigurationId = await ensureStripePortalConfiguration(appUrl);
    const portal = await stripe.billingPortal.configurations.retrieve(portalConfigurationId);
    const portalOk =
      portal.active &&
      portal.business_profile.privacy_policy_url === `${appUrl}/privacy` &&
      portal.business_profile.terms_of_service_url === `${appUrl}/terms` &&
      portal.features.payment_method_update.enabled &&
      portal.features.invoice_history.enabled &&
      portal.features.subscription_cancel.enabled &&
      portal.features.subscription_cancel.mode === "at_period_end";

    const webhookUrl = `${appUrl}/api/stripe/webhook`;
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const webhookEndpoint = webhookEndpoints.data.find(
      (endpoint) =>
        endpoint.url === webhookUrl &&
        endpoint.status === "enabled" &&
        REQUIRED_WEBHOOK_EVENTS.every((event) => endpoint.enabled_events.includes(event))
    );

    const prices = Object.fromEntries(priceChecks);
    const ready =
      mode === "live" &&
      appUrl === "https://chatbot-support.com" &&
      publishableKey.startsWith("pk_live_") &&
      webhookSecret.startsWith("whsec_") &&
      Object.values(prices).every(Boolean) &&
      portalOk &&
      Boolean(webhookEndpoint);

    return jsonOk(
      {
        ready,
        mode,
        appUrlOk: appUrl === "https://chatbot-support.com",
        secretKeyOk: true,
        publishableKeyOk: publishableKey.startsWith("pk_live_"),
        webhookSecretConfigured: webhookSecret.startsWith("whsec_"),
        webhookEndpointOk: Boolean(webhookEndpoint),
        portalConfigurationOk: portalOk,
        prices,
      },
      ready ? 200 : 503
    );
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      console.error("[stripe readiness] configuration error:", error.message);
    } else {
      console.error("[stripe readiness] check failed:", error);
    }
    return jsonOk({ ready: false, checkError: true }, 503);
  }
}
