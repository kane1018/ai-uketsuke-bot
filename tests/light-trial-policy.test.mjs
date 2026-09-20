import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("new users derive the 30-day Light trial from the existing profile creation timestamp", () => {
  const billing = source("../src/lib/billing.ts");
  const plans = source("../src/lib/plans.ts");
  assert.match(billing, /select\("created_at"\)/);
  assert.match(billing, /getLightTrialEndsAt\(startedAt\)/);
  assert.match(plans, /LIGHT_TRIAL_DAYS = 30/);
  assert.match(plans, /LIGHT_TRIAL_LAUNCH_AT/);
});

test("effective plan prefers paid access, then light trial, then free", () => {
  const billing = source("../src/lib/billing.ts");
  assert.match(billing, /PlanAccessSource = "paid" \| "light_trial" \| "free"/);
  assert.match(billing, /paidPlanId/);
  assert.match(billing, /trial\.active/);
});

test("light trial is card-free and never silently starts paid checkout", () => {
  const checkout = source("../src/app/api/stripe/checkout/route.ts");
  const pricing = source("../src/app/pricing/page.tsx");
  const policy = source("../docs/product-policy.md");

  assert.match(checkout, /plan === "light" && effectivePlan\.accessSource === "light_trial"/);
  assert.match(pricing, /クレジットカード登録不要・自動課金なし/);
  assert.match(policy, /30日経過時に自動課金は行わず/);
  assert.match(policy, /自動的に無料プランへ戻す/);
});
