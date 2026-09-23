"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/plans";
import { signupPath } from "@/lib/use-cases";
export function PricingAction({plan,loggedIn,isCurrent,isTrialCurrent=false,trialActive=false}:{plan:PlanId;loggedIn:boolean;isCurrent:boolean;isTrialCurrent?:boolean;trialActive?:boolean}){
  const router=useRouter();const [loading,setLoading]=useState(false);const [confirming,setConfirming]=useState(false);const [error,setError]=useState<string|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);const pending=useRef(false);const selectedPlan=PLANS[plan];
  useEffect(()=>{const node=dialog.current;if(!node)return;if(confirming&&!node.open)node.showModal();else if(!confirming&&node.open)node.close();},[confirming]);
  async function checkout(){if(plan==="free"||isCurrent||pending.current)return;pending.current=true;setLoading(true);setError(null);
    try{const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json();if(!response.ok){if(data.portalRequired){router.push("/dashboard/billing");return;}throw new Error(data.error||"決済画面を準備できませんでした。もう一度お試しください。");}if(typeof data.url!=="string")throw new Error("決済画面を準備できませんでした。");window.location.assign(data.url);}
    catch(e){setError(e instanceof Error?e.message:"通信を確認してもう一度お試しください。");pending.current=false;setLoading(false);}}
  if(!loggedIn)return <Link className={plan==="light"?"btn-primary w-full":"btn-secondary w-full"} href={plan==="free"||plan==="light"?signupPath():"/signup?next=%2Fpricing"}>{plan==="light"?"まず30日無料で試す":plan==="free"?"無料で始める":"登録してプランを選ぶ"}</Link>;
  if(isTrialCurrent)return <Link href="/dashboard" className="btn-primary w-full">無料体験を使う →</Link>;
  if(isCurrent)return <Link href="/dashboard/billing" className="btn-secondary w-full">現在のプランを確認</Link>;
  if(plan==="free")return <p className="rounded-lg bg-slate-50 p-3 text-center text-xs leading-6 text-slate-500">{trialActive?"体験終了後に自動で移行":"解約は「プラン・請求」から"}</p>;
  return <><button className="btn-primary w-full" disabled={loading} onClick={()=>{setError(null);setConfirming(true);}}>{loading?"準備しています…":trialActive?"有料で切り替える":"このプランを選ぶ"}</button>
    <dialog ref={dialog} aria-labelledby={`checkout-title-${plan}`} aria-describedby={`checkout-desc-${plan}`} onCancel={(event)=>{if(pending.current)event.preventDefault();else setConfirming(false);}} onClose={()=>setConfirming(false)} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
      <h2 id={`checkout-title-${plan}`} className="text-xl font-bold">有料プランの申込内容を確認</h2><p id={`checkout-desc-${plan}`} className="mt-3 text-sm leading-7 text-slate-600">このボタンだけでは決済されません。次のStripe画面で支払い方法と契約を最終確認します。</p>
      {trialActive&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">無料体験とは別の有料契約です。このプランは申込時から料金が発生します。</p>}
      <dl className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm">{[["プラン",selectedPlan.name],["料金",`${selectedPlan.price.toLocaleString()}円 / 1か月（支払総額）`],["契約期間","1か月。解約まで1か月ごとに自動更新"],["12か月継続時",`${(selectedPlan.price*12).toLocaleString()}円`],["支払時期","初回申込時、その後は各請求期間の開始時"],["提供時期","決済完了後、原則として直ちに利用可能"],["解約","次回更新日前までに請求管理から手続き。解約手数料なし"],["解約後","原則として支払済み期間の終了まで利用可能"],["返金","利用者都合の日割り・返金は原則なし。重複決済・当方不具合等は個別対応"]].map(([label,value])=><div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[7rem_1fr]"><dt className="font-semibold">{label}</dt><dd className="leading-6 text-slate-600">{value}</dd></div>)}</dl>
      {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-800">{error}</p>}
      <p className="mt-4 text-xs leading-7 text-slate-600">詳細：{[["/terms","利用規約"],["/legal","特商法表記"],["/refund-policy","解約・返金"],["/privacy","プライバシー"]].map(([href,label])=><a key={href} href={href} target="_blank" rel="noopener noreferrer" className="mr-3 text-brand-700 underline">{label}（別タブ）</a>)}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="btn-secondary" disabled={loading} onClick={()=>setConfirming(false)}>戻る</button><button className="btn-primary" disabled={loading} onClick={checkout}>{loading?"決済画面を準備中…":"Stripeで最終確認へ"}</button></div>
    </dialog></>;
}
