import assert from "node:assert/strict";
import test from "node:test";
import { authDestination } from "../src/lib/navigation.ts";
import { signupPath, createPath, USE_CASES } from "../src/lib/use-cases.ts";
import { responseListParams,responseListHref } from "../src/lib/response-list.ts";
test("the selected purpose and industry survive signup and login destinations",()=>{
 for(const item of USE_CASES){const signup=new URL(signupPath(item.purpose,item.industry),"https://example.com");assert.equal(authDestination(signup.searchParams.get("next")),createPath(item.purpose,item.industry));}
});
test("auth redirects cannot leave the site or loop into auth/API endpoints",()=>{
 for(const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/signup?next=/login", "/auth/callback", "/api/stripe/checkout"]){assert.equal(authDestination(bad),"/dashboard",bad);}
 assert.equal(authDestination("/reset-password"),"/reset-password");
});
test("response pagination remains bounded and ignores malformed filters",()=>{
 for(const page of ["NaN","Infinity","-1","0","1.2","9007199254740992"]){assert.equal(responseListParams({page,status:"sql injected"}).page,1);}
 const result=responseListParams({page:"2",status:"new"});assert.deepEqual(result,{page:2,status:"new",size:25,offset:25});
 assert.equal(responseListParams({page:"99999999"}).page,100000);
 assert.equal(responseListHref("id",1,"new"),"/dashboard/bots/id/responses?status=new");assert.equal(responseListHref("id",2,"closed"),"/dashboard/bots/id/responses?page=2&status=closed");
});
