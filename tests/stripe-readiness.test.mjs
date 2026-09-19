import assert from "node:assert/strict";
import test from "node:test";

import { evaluateStripeAccountReadiness } from "../src/lib/stripe-readiness.ts";

function account(overrides = {}) {
  return {
    id: "acct_expected",
    charges_enabled: true,
    payouts_enabled: true,
    requirements: {
      currently_due: [],
      past_due: [],
      disabled_reason: null,
    },
    ...overrides,
  };
}

test("Stripe account readiness requires the expected fully enabled account", () => {
  assert.deepEqual(evaluateStripeAccountReadiness(account(), "acct_expected"), {
    accountMatches: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    requirementsClear: true,
    ready: true,
  });

  assert.equal(
    evaluateStripeAccountReadiness(account(), "acct_other").ready,
    false
  );
  assert.equal(
    evaluateStripeAccountReadiness(
      account({ charges_enabled: false }),
      "acct_expected"
    ).ready,
    false
  );
  assert.equal(
    evaluateStripeAccountReadiness(
      account({ payouts_enabled: false }),
      "acct_expected"
    ).ready,
    false
  );
});

test("Stripe account readiness blocks compliance review requirements", () => {
  const underReview = account({
    requirements: {
      currently_due: ["other_compliance_inquiry.form"],
      past_due: ["other_compliance_inquiry.form"],
      disabled_reason: "under_review",
    },
  });

  const result = evaluateStripeAccountReadiness(
    underReview,
    "acct_expected"
  );
  assert.equal(result.requirementsClear, false);
  assert.equal(result.ready, false);
});
