import "server-only";

import Stripe from "stripe";
import { PAID_PLANS, isPlanId, type PlanId, type SubscriptionStatus } from "@/lib/plans";

let stripeClient: Stripe | null = null;

export class StripeConfigurationError extends Error {}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new StripeConfigurationError("STRIPE_SECRET_KEYが設定されていません");
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      appInfo: { name: "AI Reception Bot" },
    });
  }
  return stripeClient;
}

const PRICE_ENV: Record<Exclude<PlanId, "free">, string> = {
  light: "STRIPE_PRICE_LIGHT",
  standard: "STRIPE_PRICE_STANDARD",
  pro: "STRIPE_PRICE_PRO",
};

export function getPriceId(plan: PlanId) {
  if (plan === "free") throw new StripeConfigurationError("無料プランはCheckoutを利用できません");
  const priceId = process.env[PRICE_ENV[plan]];
  if (!priceId) throw new StripeConfigurationError(`${PRICE_ENV[plan]}が設定されていません`);
  return priceId;
}

export function getPlanFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of PAID_PLANS) {
    if (process.env[PRICE_ENV[plan]] === priceId) return plan;
  }
  return null;
}

export function normalizePlan(value: unknown): Exclude<PlanId, "free"> | null {
  return isPlanId(value) && value !== "free" ? value : null;
}

export function normalizeSubscriptionStatus(status: string): SubscriptionStatus {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "unpaid"
  ) {
    return status;
  }
  return "none";
}

export function getAppUrl(fallbackOrigin?: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}
