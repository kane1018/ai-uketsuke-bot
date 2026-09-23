import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { responseStatusLabel, responseStatusClass } from "@/lib/constants";
import { responseListParams, responseListHref } from "@/lib/response-list";
export const dynamic="force-dynamic";
export default async function ResponsesPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string;status?:string}>}){
 const {id}=await params;const filter=responseListParams(await searchParams);const supabase=await createClient();
 const {data:bot,error:botError}=await supabase.from("bots").select("id,name").eq("id",id).single();if(botError?.code==="PGRST116"||!bot)notFound();if(botError)throw new Error("受付Botを読み込めませんでした");
 let query=supabase.from("bot_responses").select("id,respondent_name,respondent_email,respondent_phone,status,created_at",{count:"exact"}).eq("bot_id",id);
 if(filter.status)query=query.eq("status",filter.status);
 const {data:responses,count,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false}).range(filter.offset,filter.offset+filter.size-1);
 if(error)throw new Error("届いた回答を読み込めませんでした");const list=responses??[];const total=count??0;
 return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">届いた回答</h2><p className="mt-2 text-sm text-slate-600">内容を確認して、普段のメールや電話で連絡しましょう。</p></div><Link href={`/dashboard/bots/${id}/publish`} className="btn-secondary">受付URLを共有</Link></div>
 <nav aria-label="回答の対応状況で絞り込み" className="flex flex-wrap gap-2">{[["","すべて"],["new","未対応"],["contacted","対応中"],["closed","完了"]].map(([value,label])=><Link key={value} href={responseListHref(id,1,value)} aria-current={(filter.status??"")===value?"page":undefined} className={`btn ${(filter.status??"")===value?"bg-brand-700 text-white":"border border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</nav>
 <p className="text-sm text-slate-500">{total.toLocaleString()}件{total>0&&` · ${Math.min(filter.offset+1,total)}–${Math.min(filter.offset+list.length,total)}件を表示`}</p>
 {list.length===0?<div className="card p-8 text-center"><h3 className="font-semibold">{filter.status?"この対応状況の回答はありません":filter.page>1?"このページに回答はありません":"まだ回答は届いていません"}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{filter.status?"別の対応状況を選ぶと、他の回答を確認できます。":"公開URLをメール署名・SNS・サイトのボタンなどに載せて、利用者に案内しましょう。"}</p><Link href={filter.status||filter.page>1?responseListHref(id,1,""):`/dashboard/bots/${id}/publish`} className="btn-secondary mt-5">{filter.status||filter.page>1?"すべての回答へ":"公開・設置の方法を見る"}</Link></div>:<ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">{list.map((r)=><li key={r.id}><Link className="group flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-brand-50 sm:p-5" href={`/dashboard/bots/${id}/responses/${r.id}`}><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 group-hover:text-brand-700">{r.respondent_name||"お名前の記入なし"}</p><p className="mt-1 break-all text-sm text-slate-600">{r.respondent_email||r.respondent_phone||"連絡先の記入なし"}</p><p className="mt-2 text-xs text-slate-500">{formatDateTime(r.created_at)}</p></div><div className="flex items-center gap-4"><span className={`badge ${responseStatusClass(r.status)}`}>{responseStatusLabel(r.status)}</span><span className="text-sm font-semibold text-brand-700">内容を見る →</span></div></Link></li>)}</ul>}
 {(filter.page>1||filter.offset+filter.size<total)&&<nav aria-label="回答一覧のページ" className="flex items-center justify-between gap-4"><div>{filter.page>1&&<Link className="btn-secondary" href={responseListHref(id,filter.page-1,filter.status??"")}>← 前の25件</Link>}</div><span className="text-sm text-slate-500">{filter.page}ページ目</span><div>{filter.offset+filter.size<total&&<Link className="btn-secondary" href={responseListHref(id,filter.page+1,filter.status??"")}>次の25件 →</Link>}</div></nav>}
 <p className="text-xs leading-7 text-slate-500">通知メールが見当たらなくても、ここに回答があれば保存されています。<Link className="text-brand-700 underline" href="/guide#responses">確認方法を見る</Link></p>
 </div>;
}
