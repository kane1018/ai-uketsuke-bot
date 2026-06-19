import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalFooter } from "@/components/LegalFooter";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">
            AI受付Bot
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost text-sm">
                ログアウト
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-2">
          <Link
            href="/dashboard"
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-700"
          >
            ダッシュボード
          </Link>
          <Link
            href="/dashboard/bots"
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-700"
          >
            Bot一覧
          </Link>
          <Link
            href="/dashboard/billing"
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-700"
          >
            プラン・請求
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
      <LegalFooter />
    </div>
  );
}
