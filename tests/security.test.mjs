import assert from "node:assert/strict";
import test from "node:test";

import { safeInternalPath } from "../src/lib/navigation.ts";
import { getClientIp } from "../src/lib/request-ip.ts";
import { validateResponseValue } from "../src/lib/response-validation.ts";

test("safeInternalPath accepts only local application paths", () => {
  assert.equal(safeInternalPath(null), "/dashboard");
  assert.equal(safeInternalPath("/dashboard/bots?tab=1#top"), "/dashboard/bots?tab=1#top");
  assert.equal(safeInternalPath("https://example.com"), "/dashboard");
  assert.equal(safeInternalPath("javascript:alert(1)"), "/dashboard");
  assert.equal(safeInternalPath("//example.com/path"), "/dashboard");
  assert.equal(safeInternalPath("/\\example.com/path"), "/dashboard");
});

test("client IP prefers Vercel's preserved forwarding header", () => {
  const trusted = new Headers({
    "x-vercel-forwarded-for": "203.0.113.10",
    "x-forwarded-for": "198.51.100.99",
    "x-real-ip": "192.0.2.5",
  });
  assert.equal(getClientIp(trusted), "203.0.113.10");

  const generic = new Headers({ "x-forwarded-for": "198.51.100.1, 198.51.100.2" });
  assert.equal(getClientIp(generic), "198.51.100.1");

  assert.equal(getClientIp(new Headers({ "x-real-ip": "192.0.2.8" })), "192.0.2.8");
  assert.equal(getClientIp(new Headers()), "unknown");
});

test("response validation rejects values outside the server question definition", () => {
  const single = {
    id: "00000000-0000-0000-0000-000000000001",
    question_text: "希望プラン",
    question_type: "single",
    options: ["A", "B"],
    is_required: true,
  };
  assert.equal(validateResponseValue(single, "A"), null);
  assert.match(validateResponseValue(single, "C") ?? "", /選択肢/);

  const multiple = { ...single, question_type: "multiple" };
  assert.equal(validateResponseValue(multiple, ["A", "B"]), null);
  assert.match(validateResponseValue(multiple, ["A", "C"]) ?? "", /無効な選択肢/);
});

test("response validation enforces typed contact and date fields", () => {
  const base = {
    id: "00000000-0000-0000-0000-000000000002",
    options: [],
    is_required: true,
  };
  assert.equal(validateResponseValue({ ...base, question_text: "メール", question_type: "email" }, "a@example.com"), null);
  assert.match(validateResponseValue({ ...base, question_text: "メール", question_type: "email" }, "not-an-email") ?? "", /メールアドレス/);
  assert.equal(validateResponseValue({ ...base, question_text: "日付", question_type: "date" }, "2026-09-17"), null);
  assert.match(validateResponseValue({ ...base, question_text: "日付", question_type: "date" }, "2026-02-31") ?? "", /日付/);
});

test("optional empty answers remain valid", () => {
  assert.equal(
    validateResponseValue({
      id: "00000000-0000-0000-0000-000000000003",
      question_text: "備考",
      question_type: "textarea",
      options: [],
      is_required: false,
    }, ""),
    null
  );
});
