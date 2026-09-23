import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingShell, TrialCta } from "@/components/MarketingShell";
import { pageMetadata, SITE_URL } from "@/lib/site";
import { USE_CASES, signupPath } from "@/lib/use-cases";
export const metadata = pageMetadata("会話形式の問い合わせフォームを30日無料で", "問い合わせで必要な情報を1問ずつ聞ける受付Bot。質問テンプレートから作成し、URL共有やサイト埋め込みで受付を開始。ライト30日無料・カード不要・自動課金なし。", "/");
const FAQ = [
 ["AIが問い合わせに答えるチャットボットですか？", "いいえ。あらかじめ決めた質問を1問ずつ表示する、会話形式の受付フォームです。回答を受け付けたあと、内容を確認して返信するのは担当者です。自動回答の誤りを心配せず、聞きたい項目を自分で決められます。"],
 ["ホームページや専門知識がなくても使えますか？", "はい。テンプレートを選んで公開すると、専用のURLが発行されます。URLをメールやSNSで共有するだけでも利用できます。ホームページへの埋め込みは任意です。"],
 ["30日後に勝手に料金がかかりますか？", "かかりません。カード登録は不要で、有料契約をしない場合は無料プランへ戻ります。無料プランはBot1個・月30回答までで、公開URLは継続利用できます。サイトへの埋め込みは停止します。"],
 ["無料体験中に作ったBotや回答は消えますか？", "無料体験の終了だけを理由に削除しません。保存した内容は管理画面で確認できます。体験終了後の受付には無料プランの月30回答の上限が適用されます。"],
 ["予約の確定やファイル添付はできますか？", "現在は受付に特化しています。日付の希望は聞けますが、空き枠と連動した予約確定、決済受付、履歴書などのファイル添付はできません。"],
];
export default async function Home({ searchParams }: { searchParams: Promise<{code?:string}> }) {
  const {code}=await searchParams;
  if(code) redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=%2Freset-password`);
  return <MarketingShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:"受付Bot",url:SITE_URL,inLanguage:"ja"}).replace(/</g,"\u003c")}} />
    <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-white to-brand-50">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div><p className="eyebrow">小さな事業の、最初の受付に。</p><h1 className="mt-5 text-4xl font-bold leading-[1.45] tracking-tight text-slate-900 sm:text-5xl">問い合わせの<br />「聞き直し」を、<br /><span className="text-brand-700">受付から減らす。</span></h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">相談内容や希望時期を、1問ずつ。<br />必要な情報が揃う<span className="font-semibold text-slate-900">会話形式のフォーム</span>を、テンプレートから作れます。</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={signupPath()} className="btn-primary py-3.5">30日無料で受付を作る →</Link><Link href="/demo" className="btn-secondary py-3.5">登録せずデモを試す</Link></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">カード不要・自動課金なし<br />終了後は無料プランへ。希望する方だけ月980円で継続。</p>
        </div>
        <div className="relative mx-auto w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60">
          <div className="rounded-2xl border border-slate-100"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">受</span><div><p className="font-bold">さくら事務所の相談受付</p><p className="text-xs text-slate-500">画面イメージ・架空の事務所</p></div></div>
            <div className="space-y-5 bg-slate-50 p-5"><p className="chat-example">こんにちは。ご相談の分野を教えてください。</p><p className="ml-auto w-fit rounded-2xl rounded-br-sm bg-brand-700 px-4 py-3 text-sm text-white">相続の手続きについて</p><p className="chat-example">いつごろのご相談を希望されますか？</p><div className="grid gap-2"><span className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-brand-800">できるだけ早く</span><span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">1か月以内</span></div><p className="text-center text-xs text-slate-500">質問の内容・順番は自由に編集できます</p></div>
          </div><Link className="mt-3 block rounded-xl bg-brand-50 px-4 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-brand-100" href="/demo">回答する側の使い心地を試す →</Link>
        </div>
      </div>
    </section>
    <section className="section-wrap"><div className="section-heading"><p className="eyebrow">WHAT IT DOES</p><h2>担当者が返信する前に、<br className="sm:hidden" />聞きたいことを揃える。</h2><p>AIが自由に回答するツールではありません。自分で決めた質問に沿って、問い合わせを受け付けます。</p></div>
      <div className="grid gap-5 md:grid-cols-3">{[["01","質問は、ひとつずつ。","長いフォームを一度に見せず、会話するように入力できます。選択式・メール・日付などを使い分けられます。"],["02","必要な項目を、自分で。","用途と業種に合うテンプレートから開始。質問の追加・必須設定・順番の変更ができます。"],["03","届いた回答を、まとめて。","回答を管理画面で確認し、対応状況を整理。設定した通知先メールにも新着をお知らせします。"]].map(([number,title,body])=><article key={number} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-sm font-bold tracking-widest text-brand-700">{number}</span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></article>)}</div>
    </section>
    <section className="bg-slate-50"><div className="section-wrap"><div className="section-heading"><p className="eyebrow">HOW TO START</p><h2>作る、確認する、URLを渡す。</h2><p>最初からサイトのコードを触る必要はありません。</p></div><ol className="grid gap-8 md:grid-cols-3">{[["1","テンプレートを選ぶ","相談受付・問い合わせ・応募など、目的と業種を選びます。"],["2","質問を確認して公開","会社名と通知先を設定し、質問を確認。自分で回答して動きを試せます。"],["3","URLを共有して受付開始","メール署名やSNSにURLを載せれば準備完了。サイトへの埋め込みも選べます。"]].map(([n,t,b])=><li key={n}><span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-slate-900 font-bold text-white">{n}</span><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{b}</p></li>)}</ol><Link className="mt-8 inline-block font-semibold text-brand-700 underline underline-offset-4" href="/guide">画面ごとのはじめ方を見る →</Link></div></section>
    <section className="section-wrap"><div className="section-heading"><p className="eyebrow">USE CASES</p><h2>あなたの仕事なら、どう使う？</h2><p>最初に聞くことが決まっている業務に向いています。</p></div><div className="grid gap-5 md:grid-cols-3">{USE_CASES.map((item)=><Link key={item.slug} href={`/templates/${item.slug}`} className="group rounded-2xl border border-slate-200 p-6 transition-colors hover:border-brand-300 hover:bg-brand-50"><p className="text-xs font-medium text-slate-500">{item.audience}</p><h3 className="mt-3 text-xl font-bold group-hover:text-brand-700">{item.name}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.benefit}</p><p className="mt-6 text-sm font-semibold text-brand-700">質問例と使い方を見る →</p></Link>)}</div></section>
    <section className="section-wrap border-t border-slate-100"><div className="grid gap-8 md:grid-cols-[1fr_1.2fr]"><div><p className="eyebrow">NO SURPRISES</p><h2 className="mt-4 text-3xl font-bold leading-relaxed">まず30日、<br />実際の受付に使ってみる。</h2><p className="mt-4 leading-7 text-slate-600">ライトの全機能を、カード登録なしで。<br />気に入ったときだけ、有料で続けられます。</p><Link href="/pricing" className="mt-6 inline-block font-semibold text-brand-700 underline underline-offset-4">全プランと終了後の条件を見る →</Link></div><div className="rounded-2xl bg-brand-50 p-6 sm:p-8"><p className="text-sm font-semibold text-brand-800">30日間の無料体験</p><p className="mt-3 text-4xl font-bold text-slate-900">0円<span className="ml-2 text-base font-normal text-slate-600">カード不要</span></p><p className="mt-5 leading-7 text-slate-700">Bot 1個 / 回答数無制限 / メール通知<br />公開URL / ホームページへの埋め込み</p><div className="mt-6 border-t border-brand-200 pt-5 text-sm leading-7 text-slate-600">体験終了後：無料プラン（Bot1個・月30回答・埋め込み不可）へ。継続契約する場合：ライト月980円。Botや保存した回答は、体験終了だけでは削除しません。</div></div></div></section>
    <section className="section-wrap border-t border-slate-100"><div className="section-heading"><p className="eyebrow">FAQ</p><h2>始める前の、よくある疑問。</h2></div><div className="mx-auto max-w-3xl divide-y divide-slate-200">{FAQ.map(([q,a])=><details key={q} className="group py-5"><summary className="cursor-pointer pr-5 font-semibold leading-7 text-slate-900">{q}</summary><p className="mt-4 text-sm leading-8 text-slate-600">{a}</p></details>)}</div></section><TrialCta />
  </MarketingShell>;
}
