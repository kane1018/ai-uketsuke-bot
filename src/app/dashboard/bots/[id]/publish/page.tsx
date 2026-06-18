import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublishControls } from "@/components/PublishControls";
import { CopyButton } from "@/components/CopyButton";
import { publicChatUrl, embedUrl, embedCode } from "@/lib/utils";
import type { BotStatus } from "@/lib/types";
import Link from "next/link";
import { getEffectivePlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function PublishPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, status, public_slug")
    .eq("id", params.id)
    .single();

  if (!bot) notFound();
  if (!user) notFound();
  const { plan } = await getEffectivePlan(user.id);

  const { count: questionCount } = await supabase
    .from("bot_questions")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", bot.id);

  const canPublish = (questionCount ?? 0) > 0;
  const isPublished = bot.status === "published";

  const chatUrl = publicChatUrl(bot.public_slug);
  const iframeUrl = embedUrl(bot.public_slug);
  const iframe = embedCode(bot.public_slug);

  return (
    <div className="space-y-5">
      <PublishControls
        botId={bot.id}
        status={bot.status as BotStatus}
        canPublish={canPublish}
      />

      {/* Public URL */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold">公開URL</h2>
        <p className="mt-1 text-xs text-gray-500">
          このURLを共有すると、誰でもチャットに回答できます。
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {chatUrl}
          </code>
          <div className="flex gap-2">
            <CopyButton value={chatUrl} />
            {isPublished && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                開く
              </a>
            )}
          </div>
        </div>
        {!isPublished && (
          <p className="mt-2 text-xs text-amber-600">
            ※ 公開していないため、このURLにアクセスしても表示されません。
          </p>
        )}
      </div>

      {/* Embed code */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold">iframe 埋め込みコード</h2>
        {plan.iframeEnabled ? (
          <>
            <p className="mt-1 text-xs text-gray-500">
              自社サイトのHTMLにこのコードを貼り付けると、チャットを埋め込めます。
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
              <code>{iframe}</code>
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={iframe} label="埋め込みコードをコピー" />
              {isPublished && (
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  埋め込み画面を確認
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
            <p>iframe埋め込みはライトプラン以上で利用できます。</p>
            <Link href="/pricing" className="mt-2 inline-block font-semibold underline">
              プランを確認する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
