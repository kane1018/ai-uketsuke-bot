import Link from "next/link";
import { LegalFooter } from "@/components/LegalFooter";
import { signupPath } from "@/lib/use-cases";

export function MarketingHeader() {
  return <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
      <Link href="/" aria-label="受付Bot ホーム" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900"><span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-base text-white">受</span>受付Bot</Link>
      <div className="flex gap-2 sm:order-2"><Link href="/login" className="btn-ghost">ログイン</Link><Link href={signupPath()} className="btn-primary">無料で始める</Link></div>
      <nav aria-label="サービス案内" className="flex w-full gap-5 overflow-x-auto text-sm font-medium text-slate-600 sm:order-1 sm:w-auto sm:gap-6">
        <Link className="whitespace-nowrap py-2 hover:text-brand-700" href="/demo">デモを試す</Link>
        <Link className="whitespace-nowrap py-2 hover:text-brand-700" href="/templates">使い方の例</Link>
        <Link className="whitespace-nowrap py-2 hover:text-brand-700" href="/pricing">料金</Link>
        <Link className="whitespace-nowrap py-2 hover:text-brand-700" href="/guide">はじめ方</Link>
      </nav>
    </div>
  </header>;
}
export function MarketingFooter() {
  return <footer className="mt-16 border-t border-slate-200 bg-white">
    <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-4 py-10 text-sm text-slate-600 sm:px-6">
      <div><p className="font-bold text-slate-900">受付Bot</p><p className="mt-2">必要なことを、1問ずつ聞ける受付フォーム。</p></div>
      <nav aria-label="ヘルプとサービス" className="flex flex-wrap gap-x-6 gap-y-3"><Link href="/templates">業種別の活用例</Link><Link href="/guide#install">設置方法</Link><Link href="/guide#trial">無料体験について</Link><a href="mailto:support@chatbot-support.com">お問い合わせ</a></nav>
    </div><LegalFooter />
  </footer>;
}
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white"><MarketingHeader /><main id="main-content">{children}</main><MarketingFooter /></div>;
}
export function TrialCta({ title = "まずは、自分で回答してみませんか。" }: { title?: string }) {
  return <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="rounded-3xl bg-slate-900 px-6 py-10 text-white sm:p-12">
    <h2 className="text-2xl font-bold leading-relaxed sm:text-3xl">{title}</h2><p className="mt-3 leading-7 text-slate-300">ライトプランを30日間無料で。カード不要・自動課金なし。<br className="hidden sm:block" />終了後は無料プランへ戻り、希望する方だけ月980円で継続できます。</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href={signupPath()} className="btn bg-white text-slate-900 hover:bg-slate-100">30日無料で作ってみる →</Link><Link href="/demo" className="btn border border-slate-500 text-white hover:bg-slate-800">登録せずデモを試す</Link></div>
  </div></section>;
}
