import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotStatusBadge } from "@/components/BotStatusBadge";
import { BotTabs } from "@/components/BotTabs";
import { purposeLabel, industryLabel } from "@/lib/constants";
import type { BotStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: bot } = await supabase
    .from("bots")
    .select("id, name, purpose, industry, status")
    .eq("id", params.id)
    .single();

  if (!bot) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/bots"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Bot一覧に戻る
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">
            {bot.name || "（無題のBot）"}
          </h1>
          <BotStatusBadge status={bot.status as BotStatus} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="badge bg-brand-50 text-brand-700">
            {purposeLabel(bot.purpose)}
          </span>
          <span className="badge bg-gray-100 text-gray-600">
            {industryLabel(bot.industry)}
          </span>
        </div>
      </div>

      <BotTabs botId={bot.id} />

      <div className="pt-2">{children}</div>
    </div>
  );
}
