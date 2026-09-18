import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { PLANS } from "../src/lib/plans.ts";

test("fixed pricing keeps only the free plan response-capped", () => {
  assert.equal(PLANS.free.price, 0);
  assert.equal(PLANS.light.price, 980);
  assert.equal(PLANS.standard.price, 1980);
  assert.equal(PLANS.pro.price, 3980);

  assert.equal(PLANS.free.monthlyResponseLimit, 30);
  assert.equal(PLANS.light.monthlyResponseLimit, null);
  assert.equal(PLANS.standard.monthlyResponseLimit, null);
  assert.equal(PLANS.pro.monthlyResponseLimit, null);
});

test("bot creation is backed by local templates rather than an AI endpoint", () => {
  const source = readFileSync(new URL("../src/lib/bot-templates.ts", import.meta.url), "utf8");
  assert.match(source, /consultation:/);
  assert.match(source, /メールアドレスを教えてください/);
  assert.match(source, /buildBotTemplate/);
  assert.doesNotMatch(source, /OpenAI|chat\.completions|OPENAI_API_KEY/);
});

test("OpenAI is not part of the application runtime", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies?.openai, undefined);
  assert.equal(existsSync(new URL("../src/lib/openai.ts", import.meta.url)), false);
  assert.equal(
    existsSync(new URL("../src/app/api/bots/[id]/generate/route.ts", import.meta.url)),
    false
  );
});
