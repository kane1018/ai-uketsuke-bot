import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicChatUrl } from "@/lib/utils";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function BotOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!bot) notFound();

  const { count: questionCount } = await supabase
    .from("bot_questions")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", bot.id);

  const { count: responseCount } = await supabase
    .from("bot_responses")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", bot.id);

  const chatUrl = publicChatUrl(bot.public_slug);

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionCard
          href={`/dashboard/bots/${bot.id}/edit`}
          icon="✏️"
          label="質問を編集"
        />
        <ActionCard
          href={`/dashboard/bots/${bot.id}/preview`}
          icon="👀"
          label="プレビュー"
        />
        <ActionCard
          href={`/dashboard/bots/${bot.id}/publish`}
          icon="🚀"
          label="公開設定"
        />
        <ActionCard
          href={`/dashboard/bots/${bot.id}/responses`}
          icon="📥"
          label={`回答ログ (${responseCount ?? 0})`}
        />
      </div>

      {/* Status / link */}
      {bot.status === "published" ? (
        <div className="card p-4">
          <p className="text-sm font-semibold text-green-700">
            ● 公開中
          </p>
          <p className="mt-1 text-xs text-gray-500">公開URL</p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-sm text-brand-600 hover:underline"
            >
              {chatUrl}
            </a>
            <CopyButton value={chatUrl} />
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-700">
            まだ公開されていません
          </p>
          <p className="mt-1 text-xs text-gray-500">
            質問を確認したら「公開設定」から公開しましょう。
          </p>
          <Link
            href={`/dashboard/bots/${bot.id}/publish`}
            className="btn-primary mt-3"
          >
            公開設定へ
          </Link>
        </div>
      )}

      {/* Summary */}
      <div className="card divide-y divide-gray-100">
        <Row label="質問数" value={`${questionCount ?? 0} 問`} />
        <Row label="会社名・屋号" value={bot.company_name || "—"} />
        <Row label="サービス説明" value={bot.service_description || "—"} />
        <Row label="受付したい内容" value={bot.intake_goal || "—"} />
        <Row label="最終誘導 (CTA)" value={bot.final_cta || "—"} />
        <Row label="通知先メール" value={bot.notification_email || "—"} />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col items-center gap-1.5 p-4 text-center transition-shadow hover:shadow-md"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-xs text-gray-500">{label}</span>
      <span className="whitespace-pre-wrap break-words text-sm text-gray-800">
        {value}
      </span>
    </div>
  );
}
