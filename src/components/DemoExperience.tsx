"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChatForm } from "@/components/ChatForm";
import { buildBotTemplate } from "@/lib/bot-templates";
import { USE_CASES, signupPath } from "@/lib/use-cases";
import type { BotQuestion } from "@/lib/types";

export function DemoExperience({ initialIndustry }: { initialIndustry?: string }) {
  const [selected, setSelected] = useState(USE_CASES.find((item) => item.industry === initialIndustry)?.slug ?? "professional");
  const [version, setVersion] = useState(0);
  const item = USE_CASES.find((item) => item.slug === selected) ?? USE_CASES[0];
  const template = useMemo(() => buildBotTemplate({purpose:item.purpose, industry:item.industry, company_name:"サンプル事業者", final_cta:"ここまでが回答者の体験です。自分の受付フォームを作ってみましょう。"}),[item]);
  const questions: BotQuestion[] = template.questions.map((q,index)=>({...q,id:`demo-${index}`,bot_id:"demo",created_at:"",updated_at:""}));
  return <div className="grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr]">
    <div><h2 className="text-xl font-bold">試したい受付を選ぶ</h2><p className="mt-2 text-sm leading-7 text-slate-600">サンプルに回答して、使い心地を確かめてください。本名などの個人情報は入力しないでください。</p>
      <div className="mt-5 grid gap-3" role="group" aria-label="デモの業種">{USE_CASES.map((entry)=><button key={entry.slug} type="button" onClick={()=>{setSelected(entry.slug);setVersion(0);}} aria-pressed={selected===entry.slug} className={`rounded-xl border p-4 text-left transition-colors ${selected===entry.slug?"border-brand-500 bg-brand-50 ring-1 ring-brand-500":"border-slate-200 bg-white hover:bg-slate-50"}`}><span className="font-semibold">{entry.name}</span><span className="mt-1 block text-sm text-slate-600">{entry.benefit}</span></button>)}</div>
      <p className="mt-3 text-xs leading-6 text-slate-500">切り替えるとデモの回答はリセットされます。入力内容は保存・送信されません。</p>
      <div className="mt-6 rounded-xl bg-slate-50 p-5"><p className="font-semibold">自分の業務に合わせられます</p><p className="mt-2 text-sm leading-7 text-slate-600">作成後に質問の文言・順番・回答形式・必須項目を編集できます。コードを書く必要はありません。</p><Link href={signupPath(item.purpose,item.industry)} className="btn-primary mt-4 w-full">このテンプレートで無料作成 →</Link><p className="mt-3 text-center text-xs leading-6 text-slate-500">30日無料・カード不要・自動課金なし</p></div>
    </div>
    <div className="min-w-0"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-brand-800">回答者から見える画面</p><button type="button" className="btn-ghost text-xs" onClick={()=>setVersion((v)=>v+1)}>最初から試す</button></div><div className="demo-frame overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50"><ChatForm key={`${selected}-${version}`} slug="demo" botName={`${item.name}（デモ）`} operatorName="サンプル事業者" questions={questions} openingMessage={template.opening_message} completionMessage="デモは終了です。入力内容は送信・保存していません。" ctaMessage={template.cta_message} showBranding preview /></div></div>
  </div>;
}
