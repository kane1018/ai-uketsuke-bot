import Link from "next/link";
import { LegalFooter } from "@/components/LegalFooter";

export function LegalPageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-brand-700">
            AI受付Bot
          </Link>
          <Link href="/pricing" className="btn-ghost">
            料金プラン
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">{description}</p>
          <p className="mt-2 text-xs text-gray-400">制定日：2026年6月19日</p>
        </div>
        <article className="card space-y-8 p-6 leading-7 sm:p-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:text-sm [&_p]:text-gray-700 [&_ul]:mt-3 [&_ul]:space-y-1 [&_ul]:text-sm [&_ul]:text-gray-700">
          {children}
        </article>
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          本ページはSaaS公開前のたたき台であり、法的助言ではありません。事業内容や法令の変更に応じて見直し、本番で実課金を開始する前に事業者本人または専門家が確認してください。
        </p>
      </main>
      <LegalFooter />
    </div>
  );
}
