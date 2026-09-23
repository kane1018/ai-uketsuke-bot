import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/MarketingShell";
import { pageMetadata, SITE_URL } from "@/lib/site";
import { USE_CASES, getUseCase, signupPath } from "@/lib/use-cases";
export function generateStaticParams(){return USE_CASES.map((item)=>({slug:item.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=getUseCase(slug);return item?pageMetadata(`${item.name}のフォーム・質問例`,item.description,`/templates/${slug}`):{title:"ページが見つかりません",robots:{index:false}};}
export default async function UseCasePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const item=getUseCase(slug);if(!item)notFound();
 const breadcrumb={
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  itemListElement:[
   {"@type":"ListItem",position:1,name:"ホーム",item:SITE_URL},
   {"@type":"ListItem",position:2,name:"業種別の使い方",item:`${SITE_URL}/templates`},
   {"@type":"ListItem",position:3,name:item.name,item:`${SITE_URL}/templates/${slug}`},
  ],
 };
 return <MarketingShell><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb).replace(/</g,"\u003c")}}/><article className="section-wrap"><nav aria-label="パンくず" className="mb-8 text-sm text-slate-500"><Link href="/">ホーム</Link><span aria-hidden="true"> / </span><Link href="/templates">業種別の使い方</Link><span aria-hidden="true"> / </span><span>{item.name}</span></nav><p className="eyebrow">{item.audience}</p><h1 className="mt-4 max-w-3xl text-3xl font-bold leading-relaxed tracking-tight sm:text-4xl">{item.title}</h1><p className="mt-5 max-w-3xl leading-8 text-slate-600">{item.description}</p><div className="mt-7 flex flex-wrap gap-3"><Link className="btn-primary" href={signupPath(item.purpose,item.industry)}>このテンプレートで無料作成 →</Link><Link className="btn-secondary" href={`/demo?industry=${item.industry}`}>実際のデモを試す</Link></div><p className="mt-3 text-xs text-slate-500">30日無料・クレジットカード不要・自動課金なし</p>
 <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-10"><section><h2 className="text-xl font-bold">こんな受付のために</h2><p className="mt-4 leading-8 text-slate-600">{item.problem}</p></section><section><h2 className="text-xl font-bold">設置・運用の例</h2><p className="mt-4 leading-8 text-slate-600">{item.setup}</p><Link href="/guide#install" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline">URL共有・埋め込みの手順 →</Link></section><section className="rounded-2xl border border-slate-200 p-6"><h2 className="text-lg font-bold">できること・担当者が行うこと</h2><p className="mt-3 text-sm leading-8 text-slate-600">{item.caution}</p><p className="mt-3 text-sm leading-8 text-slate-600">回答は管理画面に保存されます。担当者が内容を確認し、メールや電話などで連絡してください。受付Botの画面から返信メールを送る機能はありません。</p></section></div><aside className="self-start rounded-2xl bg-brand-50 p-6 sm:p-8"><h2 className="text-xl font-bold">最初の質問例</h2><ol className="mt-5 space-y-4">{item.examples.map((q,i)=><li key={q} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-brand-700">{i+1}</span><span className="text-sm leading-7 text-slate-700">{q}</span></li>)}</ol><p className="mt-6 text-xs leading-6 text-slate-600">テンプレートの項目をもとにした構成例です。作成画面で質問を確認し、文言・順番・必須設定を変更できます。</p><Link href={`/demo?industry=${item.industry}`} className="btn-secondary mt-5 w-full">1問ずつ回答してみる</Link></aside></div>
 <section className="mt-12 rounded-2xl bg-slate-900 p-6 text-white sm:p-8"><h2 className="text-2xl font-bold">まずは実際の問い合わせに使ってみる</h2><p className="mt-3 text-sm leading-7 text-slate-300">30日間はBot1個・回答数無制限・サイト埋め込みが無料。体験終了後は無料プランへ戻り、希望する方だけライト月980円で継続できます。</p><Link className="btn mt-5 bg-white text-slate-900 hover:bg-slate-100" href={signupPath(item.purpose,item.industry)}>30日無料で始める →</Link><Link className="ml-4 inline-block py-3 text-sm underline" href="/pricing">料金と終了後の条件</Link></section>
 <nav aria-label="他の活用例" className="mt-10 flex flex-wrap gap-4 text-sm text-brand-700">{USE_CASES.filter((entry)=>entry.slug!==slug).map((entry)=><Link key={entry.slug} className="underline" href={`/templates/${entry.slug}`}>{entry.name} →</Link>)}</nav>
 </article></MarketingShell>;
}
