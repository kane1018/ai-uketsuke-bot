import assert from "node:assert/strict";
import test from "node:test";
import {syncUntouchedCopy} from "../src/lib/copy-defaults.ts";
const old={opening_message:"旧事務所へようこそ",cta_message:"後日ご連絡"};
const next={opening_message:"新事務所へようこそ",cta_message:"明日ご連絡"};
test("untouched generated copy follows company and followup changes",()=>assert.deepEqual(syncUntouchedCopy(old,old,next),next));
test("human-edited copy is never overwritten by basic info edits",()=>assert.deepEqual(syncUntouchedCopy({opening_message:"自分のあいさつ",cta_message:"自分の案内"},old,next),{}));
test("only unchanged default fields are propagated",()=>assert.deepEqual(syncUntouchedCopy({...old,cta_message:"編集済み"},old,next),{opening_message:next.opening_message}));
test("unrelated settings changes create no copy write",()=>assert.deepEqual(syncUntouchedCopy(old,old,old),{}));
