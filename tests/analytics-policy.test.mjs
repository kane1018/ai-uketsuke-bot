import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("marketing analytics and performance measurement exclude product and respondent routes", () => {
  const layout = source("../src/app/layout.tsx");
  const observability = source("../src/components/PublicObservability.tsx");
  const privacy = source("../src/app/privacy/page.tsx");
  const pkg = JSON.parse(source("../package.json"));

  assert.ok(pkg.dependencies?.["@vercel/analytics"]);
  assert.ok(pkg.dependencies?.["@vercel/speed-insights"]);
  assert.match(layout, /<PublicObservability \/>/);
  assert.match(observability, /<Analytics/);
  assert.match(observability, /<SpeedInsights \/>/);
  assert.match(observability, /pathname === "\/pricing"/);
  assert.match(observability, /pathname\.startsWith\("\/templates\/"\)/);
  assert.doesNotMatch(observability, /\/dashboard/);
  assert.doesNotMatch(observability, /\/embed/);
  assert.doesNotMatch(observability, /\/b\//);
  assert.doesNotMatch(observability, /track\s*\(/);
  assert.match(privacy, /管理画面および公開Bot・埋め込みBotの回答画面は、このアクセス解析の計測対象から除外します/);
  assert.match(privacy, /カスタムイベントとして送信しません/);
});

test("industry landing pages expose breadcrumb structured data", () => {
  const page = source("../src/app/templates/[slug]/page.tsx");
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /application\/ld\+json/);
});
