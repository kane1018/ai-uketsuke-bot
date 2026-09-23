import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {getLightTrialEndsAt,isLightTrialActive,resolvePlanAccess,LIGHT_TRIAL_DAYS} from "../src/lib/plans.ts";
const source=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("trial authority is immutable Auth registration, not editable profile fields",()=>{
 const billing=source("../src/lib/billing.ts");
 assert.match(billing,/auth\.admin\.getUserById\(userId\)/);
 assert.doesNotMatch(billing,/from\("profiles"\)/);
});
test("exact 30-day boundary changes access without a scheduled charge or job",()=>{
 const start=new Date("2026-09-23T01:02:03.000Z");const end=getLightTrialEndsAt(start.toISOString(),start);
 assert.equal(end,"2026-10-23T01:02:03.000Z");assert.equal(LIGHT_TRIAL_DAYS,30);
 for(const [delta,active] of [[-1,true],[0,false],[1,false]]){
  const now=new Date(Date.parse(end)+delta);assert.equal(isLightTrialActive(end,now),active);
  assert.equal(resolvePlanAccess(undefined,"none",isLightTrialActive(end,now)).planId,active?"light":"free");
 }
});
test("future, invalid, pre-launch and overflowing registration times never grant trial",()=>{
 const now=new Date("2026-09-23T01:02:03Z");
 for(const input of [null,undefined,"", "bad", "2026-09-19T00:00:00Z", "2026-09-24T00:00:00Z", "+275760-09-13T00:00:00Z"]){assert.equal(getLightTrialEndsAt(input,now),null,String(input));}
 assert.equal(isLightTrialActive("2099-01-01T00:00:00Z",now),false);
});
test("paid entitlement takes priority, inactive contracts revert to remaining trial or Free",()=>{
 for(const plan of ["light","standard","pro"]){for(const status of ["active","trialing","past_due"]){for(const active of [true,false])assert.deepEqual(resolvePlanAccess(plan,status,active),{planId:plan,accessSource:"paid"});}}
 for(const status of ["canceled","unpaid","incomplete","none"]){assert.deepEqual(resolvePlanAccess("pro",status,true),{planId:"light",accessSource:"light_trial"});assert.deepEqual(resolvePlanAccess("pro",status,false),{planId:"free",accessSource:"free"});}
 assert.equal(resolvePlanAccess("forged-plan","active",false).planId,"free");
});
test("Light trial cannot silently start paid checkout; policy stays explicit",()=>{
 assert.match(source("../src/app/api/stripe/checkout/route.ts"),/plan === "light" && effectivePlan\.accessSource === "light_trial"/);
 assert.match(source("../src/app/pricing/page.tsx"),/クレジットカード登録不要・自動課金なし/);
 assert.match(source("../docs/product-policy.md"),/30日経過時に自動課金は行わず/);
});
