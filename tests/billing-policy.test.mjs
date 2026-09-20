import assert from "node:assert/strict";
import test from "node:test";

import {
  LIGHT_TRIAL_DAYS,
  LIGHT_TRIAL_LAUNCH_AT,
  getLightTrialEndsAt,
  hasPaidAccess,
  isLightTrialActive,
} from "../src/lib/plans.ts";

test("paid access remains during Stripe payment retry but not after unpaid/canceled", () => {
  assert.equal(hasPaidAccess("active"), true);
  assert.equal(hasPaidAccess("trialing"), true);
  assert.equal(hasPaidAccess("past_due"), true);

  assert.equal(hasPaidAccess("incomplete"), false);
  assert.equal(hasPaidAccess("unpaid"), false);
  assert.equal(hasPaidAccess("canceled"), false);
  assert.equal(hasPaidAccess("none"), false);
});


test("card-free light trial derives a 30-day window from registration time", () => {
  assert.equal(LIGHT_TRIAL_DAYS, 30);
  assert.equal(LIGHT_TRIAL_LAUNCH_AT, "2026-09-20T00:00:00.000Z");
  assert.equal(getLightTrialEndsAt("2026-09-19T23:59:59.999Z"), null);
  assert.equal(
    getLightTrialEndsAt("2026-09-20T00:00:00.000Z"),
    "2026-10-20T00:00:00.000Z"
  );
  const now = new Date("2026-09-20T00:00:00.000Z");
  assert.equal(isLightTrialActive("2026-09-21T00:00:00.000Z", now), true);
  assert.equal(isLightTrialActive("2026-09-20T00:00:00.000Z", now), false);
  assert.equal(isLightTrialActive(null, now), false);
});
