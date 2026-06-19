import Link from "next/link";
import { PURPOSES, INDUSTRIES } from "@/lib/constants";
import { LegalFooter } from "@/components/LegalFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-brand-700">AI受付Bot</span>
          <nav className="flex items-center gap-2">
            <Link href="/pricing" className="btn-ghost hidden sm:inline-flex">
              料金プラン
            </Link>
            <Link href="/login" className="btn-ghost">
              ログイン
            </Link>
            <Link href="/signup" className="btn-primary">
              無料で始める
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          専門知識ゼロでOK
        </p>
        <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">
          目的を選ぶだけで、
          <br className="hidden sm:block" />
          自社用の
          <span className="text-brand-600">AI受付Bot</span>が作れる
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
          「問い合わせ対応」「相談受付」「採用応募受付」などの目的と業種を選ぶと、
          AIが質問項目とチャットの流れを自動生成。
          編集して公開するだけで、チャット形式の受付フォームが完成します。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary w-full sm:w-auto">
            無料でBotを作る
          </Link>
          <Link href="/login" className="btn-secondary w-full sm:w-auto">
            ログイン
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          5分で作成・公開できます
        </p>
      </section>

      {/* Steps */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold">3ステップで完成</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "目的と業種を選ぶ",
                body: "カードから選ぶだけ。難しい設定はありません。",
              },
              {
                step: "2",
                title: "AIが質問を自動生成",
                body: "会社情報を入れると、最適な質問項目をAIが作成します。",
              },
              {
                step: "3",
                title: "公開・埋め込み",
                body: "公開URLか埋め込みコードで、すぐに受付を開始できます。",
              },
            ].map((s) => (
              <div key={s.step} className="card p-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Purposes & industries */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold">
            こんな目的・業種に対応
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-5">
            {PURPOSES.map((p) => (
              <div
                key={p.value}
                className="card flex flex-col items-center p-4 text-center"
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="mt-2 text-sm font-medium">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {INDUSTRIES.map((i) => (
              <span
                key={i.value}
                className="badge bg-gray-100 text-gray-700"
              >
                {i.icon} {i.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-brand-600 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold">今すぐ無料で始めましょう</h2>
          <p className="mt-2 text-brand-100">
            クレジットカード不要。すぐにBotを作成できます。
          </p>
          <Link
            href="/signup"
            className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50"
          >
            無料で始める
          </Link>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
}
