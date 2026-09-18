import { type NextRequest } from "next/server";
import { jsonOk } from "@/lib/api";
import { PLANS } from "@/lib/plans";
import {
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

function failed(failureStage: string, extra: object = {}) {
  return jsonOk({ ready: false, failureStage, ...extra }, 503);
}

export async function GET(request: NextRequest) {
  let mode: "test" | "live";
  try {
    mode = getStripeMode();
  } catch (error) {
    console.error("[stripe readiness] invalid mode:", error);
    return failed("stripe_mode");
  }

  const appUrl = getAppUrl(request.nextUrl.origin);
  const appUrlOk = appUrl === "https://chatbot-support.com";
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const webhookSecretConfigured = webhookSecret.startsWith("whsec_");

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (error) {
    console.error("[stripe readiness] Stripe client configuration failed:", error);
    return failed("stripe_secret_key", {
      mode,
      appUrlOk,
      webhookSecretConfigured,
    });
  }

  const priceChecks: Partial<Record<(typeof PAID_PLAN_IDS)[number], boolean>> = {};
  for (const plan of PAID_PLAN_IDS) {
    try {
      const price = await stripe.prices.retrieve(getPriceId(plan));
      priceChecks[plan] =
        price.livemode === (mode === "live") &&
        price.active &&
        price.currency === "jpy" &&
        price.unit_amount === PLANS[plan].price &&
        price.recurring?.interval === "month" &&
        price.recurring.interval_count === 1;
    } catch (error) {
      console.error(`[stripe readiness] price check failed for ${plan}:`, error);
      return failed(`price_${plan}`, {
        mode,
        appUrlOk,
        webhookSecretConfigured,
        prices: priceChecks,
      });
    }
  }

  let portalConfigurationOk = false;
  try {
    const portalConfigurationId =
      await ensureStripePortalConfiguration(appUrl);
    const portal =
      await stripe.billingPortal.configurations.retrieve(
        portalConfigurationId
      );
    portalConfigurationOk =
      portal.active &&
      portal.business_profile.privacy_policy_url ===
        `${appUrl}/privacy` &&
      portal.business_profile.terms_of_service_url ===
        `${appUrl}/terms` &&
      portal.features.payment_method_update.enabled &&
      portal.features.invoice_history.enabled &&
      portal.features.subscription_cancel.enabled &&
      portal.features.subscription_cancel.mode === "at_period_end";
  } catch (error) {
    console.error("[stripe readiness] portal check failed:", error);
    return failed("portal_configuration", {
      mode,
      appUrlOk,
      webhookSecretConfigured,
      prices: priceChecks,
    });
  }

  let webhookEndpointOk = false;
  try {
    const webhookUrl = `${appUrl}/api/stripe/webhook`;
    const webhookEndpoints =
      await stripe.webhookEndpoints.list({ limit: 100 });
    webhookEndpointOk = webhookEndpoints.data.some(
      (endpoint) =>
        endpoint.url === webhookUrl &&
        endpoint.status === "enabled" &&
        REQUIRED_WEBHOOK_EVENTS.every((event) =>
          endpoint.enabled_events.includes(event)
        )
    );
  } catch (error) {
    console.error("[stripe readiness] webhook endpoint check failed:", error);
    return failed("webhook_endpoint", {
      mode,
      appUrlOk,
      webhookSecretConfigured,
      portalConfigurationOk,
      prices: priceChecks,
    });
  }

  const prices = priceChecks as Record<
    (typeof PAID_PLAN_IDS)[number],
    boolean
  >;
  const allPricesOk = Object.values(prices).every(Boolean);

  const failureStage =
    mode !== "live"
      ? "stripe_mode"
      : !appUrlOk
        ? "app_url"
        : !webhookSecretConfigured
            ? "webhook_secret"
            : !allPricesOk
              ? "prices"
              : !portalConfigurationOk
                ? "portal_configuration"
                : !webhookEndpointOk
                  ? "webhook_endpoint"
                  : null;

  const ready = failureStage === null;
  return jsonOk(
    {
      ready,
      ...(failureStage ? { failureStage } : {}),
      mode,
      appUrlOk,
      secretKeyOk: true,
      webhookSecretConfigured,
      webhookEndpointOk,
      portalConfigurationOk,
      prices,
    },
    ready ? 200 : 503
  );
}
