import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/billing";
import { BotStatusBadge } from "@/components/BotStatusBadge";
import { TrialNotice } from "@/components/TrialNotice";
import { purposeLabel, industryLabel } from "@/lib/constants";
export const dynamic="force-dynamic";
export const metadata={title:"受付のホーム"};
export default async function DashboardHome(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;
 const [botsResult,countResult,publishedResult,allResponses,newResponses,effective]=await Promise.all([
   supabase.from("bots").select("id,name,purpose,industry,status,company_name,created_at").order("created_at",{ascending:false}).limit(10),
   supabase.from("bots").select("id",{count:"exact",head:true}),
   supabase.from("bots").select("id",{count:"exact",head:true}).eq("status","published"),
   supabase.from("bot_responses").select("id",{count:"exact",head:true}),
   supabase.from("bot_responses").select("id",{count:"exact",head:true}).eq("status","new"),
   getEffectivePlan(user.id),
 ]);
 if([botsResult,countResult,publishedResult,allResponses,newResponses].some((r)=>r.error))throw new Error("管理画面の読み込みに失敗しました");
 const bots=botsResult.data??[];const botCount=countResult.count??0;const published=publishedResult.count??0;const responses=allResponses.count??0;
 const draft=bots.find((b)=>b.status!=="published");const active=bots.find((b)=>b.status==="published");const actionBot=draft??active;
 const next=botCount===0?{title:"最初の受付Botを作りましょう",body:"目的と業種を選べば、質問のたたき台ができます。最初は会社名・Bot名・通知先を決めるところから。",href:"/dashboard/bots/new",label:"テンプレートから作成 →"}:draft?{title:`「${draft.name}」の受付準備を進める`,body:"質問を確認し、動作確認で自分でも回答してみましょう。確認できたら公開してURLを共有します。",href:`/dashboard/bots/${draft.id}/edit`,label:"質問を確認して続ける →"}:responses===0?{title:"公開できました。受付URLを案内しましょう",body:"メール署名・SNS・サイトのボタンにURLを設置します。公開しただけでは利用者には届きません。設置方法もガイドで確認できます。",href:active?`/dashboard/bots/${active.id}/publish`:"/dashboard/bots",label:"公開URLと設置方法を見る →"}:{title:"届いた問い合わせに対応しましょう",body:"回答内容と連絡先を確認し、普段のメールや電話で返信してください。回答の対応状況も整理できます。",href:active?`/dashboard/bots/${active.id}/responses`:"/dashboard/bots",label:"届いた回答を確認 →"};
 return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">受付のホーム</p><h1 className="mt-2 text-2xl font-bold">現在の受付状況</h1></div>{botCount<effective.plan.botLimit&&<Link className="btn-secondary" href="/dashboard/bots/new">＋ 新しいBotを作る</Link>}</div>
 {effective.trial.endsAt&&effective.accessSource!=="paid"&&<TrialNotice endsAt={effective.trial.endsAt} expired={!effective.trial.active}/>}
 <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold tracking-widest text-brand-700">次にすること</p><h2 className="mt-3 text-xl font-bold leading-relaxed">{next.title}</h2><p className="mt-3 max-w-3xl text-sm leading-8 text-slate-600">{next.body}</p><div className="mt-5 flex flex-wrap gap-3"><Link href={next.href} className="btn-primary">{next.label}</Link><Link href="/guide" className="btn-ghost">はじめ方を見る</Link></div>
 <ol className="mt-7 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">{[[botCount>0,"1. Botを作る"],[published>0,"2. 内容を確認して公開"],[responses>0,"3. 共有して回答を受け取る"]].map(([done,label])=><li key={String(label)} className={`flex items-center gap-2 ${done?"text-brand-800":"text-slate-500"}`}><span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${done?"bg-brand-100":"bg-slate-100"}`}>{done?"✓":"○"}</span><span>{label}{done?<span className="sr-only"> 完了</span>:null}</span></li>)}</ol></section>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Bot数",botCount],["公開中",published],["届いた回答",responses],["未対応",newResponses.count??0]].map(([label,value])=><div className="card p-4" key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{Number(value).toLocaleString()}</p></div>)}</div>
 {bots.length>0&&<section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">あなたの受付Bot</h2><Link className="text-sm text-brand-700 underline" href="/dashboard/bots">すべて見る →</Link></div><ul className="grid gap-3 md:grid-cols-2">{bots.map((bot)=><li key={bot.id} className="card p-5"><div className="flex items-start justify-between gap-3"><Link href={`/dashboard/bots/${bot.id}`} className="min-w-0 font-semibold text-slate-900 underline-offset-4 hover:underline">{bot.name}</Link><BotStatusBadge status={bot.status}/></div><p className="mt-2 text-xs leading-6 text-slate-500">{industryLabel(bot.industry)} · {purposeLabel(bot.purpose)}</p><div className="mt-4 flex flex-wrap gap-2"><Link className="btn-secondary text-xs" href={`/dashboard/bots/${bot.id}/${bot.status==="published"?"responses":"edit"}`}>{bot.status==="published"?"届いた回答":"質問を編集"}</Link><Link className="btn-ghost text-xs" href={`/dashboard/bots/${bot.id}/publish`}>公開・設置</Link></div></li>)}</ul></section>}
 {actionBot&&<p className="text-xs leading-7 text-slate-500">会社名や通知先を直す場合は <Link className="text-brand-700 underline" href={`/dashboard/bots/${actionBot.id}/settings`}>基本情報</Link> へ。公開URLからの実際のテスト送信も、保存と回答件数の対象になります。</p>}
 </div>;
}
