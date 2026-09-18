import "server-only";

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

const PORTAL_HEADLINE = "受付Bot 契約管理";
const PORTAL_POLICY_METADATA = {
  service: "ai-uketsuke-bot",
  portal_policy: "v2",
} as const;
const PORTAL_PRODUCTS = [
  {
    product: "prod_Uj0gwUxkRtVlfF",
    prices: ["price_1UH4DyFoat2NfwYm8OKM91HT"],
  },
  {
    product: "prod_Uj0iwveLSczaZs",
    prices: ["price_1UH4E2Foat2NfwYml6PDoPbT"],
  },
  {
    product: "prod_Uj0kb47azNsSYc",
    prices: ["price_1UH4E5Foat2NfwYmPOUzup37"],
  },
] as const;

const CUSTOMER_UPDATES = ["name", "email", "address", "phone"] as const;
let portalConfigurationPromise: Promise<string> | null = null;

function exactSet(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && expected.every((value) => actual.includes(value));
}

export function isStripePortalConfigurationReady(
  config: Stripe.BillingPortal.Configuration,
  appUrl: string
) {
  const update = config.features.subscription_update;
  const products = update.products;
  const productsOk = products
    ? products.length === PORTAL_PRODUCTS.length &&
      PORTAL_PRODUCTS.every((expected) =>
        products.some(
          (product) =>
            product.product === expected.product &&
            exactSet(product.prices, expected.prices)
        )
      )
    : config.metadata?.service === PORTAL_POLICY_METADATA.service &&
      config.metadata?.portal_policy === PORTAL_POLICY_METADATA.portal_policy;

  return (
    config.active &&
    config.business_profile.headline === PORTAL_HEADLINE &&
    config.business_profile.privacy_policy_url === `${appUrl}/privacy` &&
    config.business_profile.terms_of_service_url === `${appUrl}/terms` &&
    config.default_return_url === `${appUrl}/dashboard/billing` &&
    config.features.customer_update.enabled &&
    exactSet(config.features.customer_update.allowed_updates, CUSTOMER_UPDATES) &&
    config.features.invoice_history.enabled &&
    config.features.payment_method_update.enabled &&
    config.features.subscription_cancel.enabled &&
    config.features.subscription_cancel.mode === "at_period_end" &&
    config.features.subscription_cancel.proration_behavior === "none" &&
    update.enabled &&
    update.billing_cycle_anchor === "unchanged" &&
    exactSet(update.default_allowed_updates, ["price"]) &&
    update.proration_behavior === "always_invoice" &&
    update.schedule_at_period_end.conditions.length === 1 &&
    update.schedule_at_period_end.conditions[0]?.type === "decreasing_item_amount" &&
    productsOk
  );
}

export async function ensureStripePortalConfiguration(appUrl: string) {
  const stripe = getStripe();
  const configured = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (configured) {
    const config = await stripe.billingPortal.configurations.retrieve(configured);
    if (!isStripePortalConfigurationReady(config, appUrl)) {
      throw new Error("Configured Stripe portal configuration does not match the required policy");
    }
    return configured;
  }

  if (!portalConfigurationPromise) {
    portalConfigurationPromise = (async () => {
      const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
      const existing = configs.data.find((config) =>
        isStripePortalConfigurationReady(config, appUrl)
      );
      if (existing) return existing.id;

      const created = await stripe.billingPortal.configurations.create({
        metadata: { ...PORTAL_POLICY_METADATA },
        business_profile: {
          headline: PORTAL_HEADLINE,
          privacy_policy_url: `${appUrl}/privacy`,
          terms_of_service_url: `${appUrl}/terms`,
        },
        default_return_url: `${appUrl}/dashboard/billing`,
        features: {
          customer_update: {
            enabled: true,
            allowed_updates: [...CUSTOMER_UPDATES],
          },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            proration_behavior: "none",
          },
          subscription_update: {
            enabled: true,
            billing_cycle_anchor: "unchanged",
            default_allowed_updates: ["price"],
            proration_behavior: "always_invoice",
            products: PORTAL_PRODUCTS.map(({ product, prices }) => ({
              product,
              prices: [...prices],
            })),
            schedule_at_period_end: {
              conditions: [{ type: "decreasing_item_amount" }],
            },
          },
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
