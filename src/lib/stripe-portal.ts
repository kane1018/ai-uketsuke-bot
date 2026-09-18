import "server-only";

import { getStripe } from "@/lib/stripe";

const PORTAL_HEADLINE = "AI受付Bot 契約管理";
let portalConfigurationPromise: Promise<string> | null = null;

export async function ensureStripePortalConfiguration(appUrl: string) {
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
