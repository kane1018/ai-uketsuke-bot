import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purposeLabel, industryLabel } from "@/lib/constants";
import { BotStatusBadge } from "@/components/BotStatusBadge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BotsListPage() {
  const supabase = await createClient();

  const { data: bots, error } = await supabase
    .from("bots")
    .select("id, name, purpose, industry, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error("受付Bot一覧を読み込めませんでした");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Bot一覧</h1>
        <Link href="/dashboard/bots/new" className="btn-primary">
          ＋ 新しいBot
        </Link>
      </div>

      {bots && bots.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bots.map((bot) => (
            <Link
              key={bot.id}
              href={`/dashboard/bots/${bot.id}`}
              className="card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 truncate font-semibold">
                  {bot.name || "（無題のBot）"}
                </h2>
                <BotStatusBadge status={bot.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="badge bg-brand-50 text-brand-700">
                  {purposeLabel(bot.purpose)}
                </span>
                <span className="badge bg-gray-100 text-gray-600">
                  {industryLabel(bot.industry)}
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                作成日 {formatDateTime(bot.created_at)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card px-4 py-16 text-center">
          <p className="text-3xl">🤖</p>
          <p className="mt-3 text-sm text-gray-500">
            まだBotがありません。
            <br />
            テンプレートを選び、質問を確認して公開できます。
          </p>
          <Link href="/dashboard/bots/new" className="btn-primary mt-5">
            ＋ 最初のBotを作る
          </Link>
        </div>
      )}
    </div>
  );
}
