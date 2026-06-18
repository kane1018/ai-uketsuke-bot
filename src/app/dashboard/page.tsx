import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purposeLabel, industryLabel } from "@/lib/constants";
import { BotStatusBadge } from "@/components/BotStatusBadge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, purpose, industry, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Aggregate counts (RLS guarantees these are the user's own bots only).
  const { count: botCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true });

  const { count: publishedCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  const { count: responseCount } = await supabase
    .from("bot_responses")
    .select("id", { count: "exact", head: true });

  const { count: newCount } = await supabase
    .from("bot_responses")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ダッシュボード</h1>
          <p className="text-sm text-gray-500">
            {user?.email} さん、こんにちは
          </p>
        </div>
        <Link href="/dashboard/bots/new" className="btn-primary">
          ＋ 新しいBotを作る
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Bot数" value={botCount ?? 0} />
        <StatCard label="公開中" value={publishedCount ?? 0} />
        <StatCard label="総回答数" value={responseCount ?? 0} />
        <StatCard label="未対応" value={newCount ?? 0} highlight />
      </div>

      {/* Recent bots */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold">最近のBot</h2>
          <Link
            href="/dashboard/bots"
            className="text-sm font-medium text-brand-600"
          >
            すべて見る
          </Link>
        </div>

        {bots && bots.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {bots.map((bot) => (
              <li key={bot.id}>
                <Link
                  href={`/dashboard/bots/${bot.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {bot.name || "（無題のBot）"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {purposeLabel(bot.purpose)} ・{" "}
                      {industryLabel(bot.industry)} ・{" "}
                      {formatDateTime(bot.created_at)}
                    </p>
                  </div>
                  <BotStatusBadge status={bot.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-500">
              まだBotがありません。最初のBotを作ってみましょう。
            </p>
            <Link href="/dashboard/bots/new" className="btn-primary mt-4">
              ＋ 新しいBotを作る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight && value > 0 ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
