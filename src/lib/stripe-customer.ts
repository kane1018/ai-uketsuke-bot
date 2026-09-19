import "server-only";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, type StripeMode } from "@/lib/stripe";

function isMissingStripeCustomer(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    (error.code === "resource_missing" || error.statusCode === 404)
  );
}

export async function getValidStripeCustomerId(
  customerId: string | null | undefined
) {
  if (!customerId) return null;

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return customer.id;
  } catch (error) {
    if (isMissingStripeCustomer(error)) return null;
    throw error;
  }
}

export async function clearStripeBillingIdentity(
  userId: string,
  stripeMode: StripeMode
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      plan: "free",
      status: "none",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    })
    .eq("user_id", userId)
    .eq("stripe_mode", stripeMode);

  if (error) {
    throw new Error(
      `Failed to clear stale Stripe billing identity: ${error.message}`
    );
  }
}

export async function createStripeCustomerForUser({
  userId,
  email,
  stripeMode,
}: {
  userId: string;
  email: string | null | undefined;
  stripeMode: StripeMode;
}) {
  const customer = await getStripe().customers.create({
    ...(email ? { email } : {}),
    metadata: { user_id: userId, stripe_mode: stripeMode },
  });

  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_mode: stripeMode,
      stripe_customer_id: customer.id,
      stripe_subscription_id: null,
      stripe_price_id: null,
      plan: "free",
      status: "none",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    },
    { onConflict: "user_id,stripe_mode" }
  );

  if (error) {
    throw new Error(`Failed to save Stripe customer: ${error.message}`);
  }
  return customer.id;
}
