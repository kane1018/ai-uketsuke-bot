import assert from "node:assert/strict";
import test from "node:test";

import { hasPaidAccess } from "../src/lib/plans.ts";

test("paid access remains during Stripe payment retry but not after unpaid/canceled", () => {
  assert.equal(hasPaidAccess("active"), true);
  assert.equal(hasPaidAccess("trialing"), true);
  assert.equal(hasPaidAccess("past_due"), true);

  assert.equal(hasPaidAccess("incomplete"), false);
  assert.equal(hasPaidAccess("unpaid"), false);
  assert.equal(hasPaidAccess("canceled"), false);
  assert.equal(hasPaidAccess("none"), false);
});
