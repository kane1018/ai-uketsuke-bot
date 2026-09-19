import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("checkout validates account-scoped Stripe customer IDs before reuse", () => {
  const checkout = source("../src/app/api/stripe/checkout/route.ts");
  assert.match(checkout, /getValidStripeCustomerId/);
  assert.match(checkout, /staleCustomer/);
  assert.match(checkout, /clearStripeBillingIdentity/);
  assert.match(checkout, /createStripeCustomerForUser/);
});

test("portal rejects a stale customer from a previous Stripe account", () => {
  const portal = source("../src/app/api/stripe/portal/route.ts");
  assert.match(portal, /getValidStripeCustomerId/);
  assert.match(portal, /clearStripeBillingIdentity/);
  assert.match(portal, /現在の決済アカウント/);
});

test("portal products are resolved from configured prices, not old account IDs", () => {
  const portal = source("../src/lib/stripe-portal.ts");
  assert.match(portal, /getStripePortalProducts/);
  assert.match(portal, /getPriceId\(plan\)/);
  assert.match(portal, /stripe\.prices\.retrieve\(priceId\)/);
  assert.doesNotMatch(portal, /prod_Uj0/);
  assert.doesNotMatch(portal, /price_1UH4/);
});

test("stale billing reset clears account-scoped Stripe references", () => {
  const customer = source("../src/lib/stripe-customer.ts");
  assert.match(customer, /resource_missing/);
  assert.match(customer, /stripe_customer_id: null/);
  assert.match(customer, /stripe_subscription_id: null/);
  assert.match(customer, /stripe_price_id: null/);
});
