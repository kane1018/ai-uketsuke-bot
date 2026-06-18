import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatForm } from "@/components/ChatForm";
import type { BotQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, name, opening_message, completion_message, cta_message")
    .eq("id", params.id)
    .single();

  if (!bot) notFound();

  const { data: questions } = await supabase
    .from("bot_questions")
    .select("*")
    .eq("bot_id", params.id)
    .order("sort_order", { ascending: true });

  const list = (questions ?? []) as BotQuestion[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        実際の公開チャット画面のプレビューです。
        <span className="font-medium text-gray-700">
          回答は保存されません。
        </span>
      </p>

      {list.length === 0 ? (
        <div className="card px-4 py-12 text-center">
          <p className="text-sm text-gray-500">
            質問がまだありません。先に質問を作成してください。
          </p>
          <Link
            href={`/dashboard/bots/${bot.id}/edit`}
            className="btn-primary mt-4"
          >
            質問を編集する
          </Link>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-sm">
          <div className="h-[560px] overflow-hidden rounded-2xl border border-gray-300 shadow-lg">
            <ChatForm
              key={list.map((q) => q.id).join(",")}
              slug=""
              botName={bot.name}
              openingMessage={bot.opening_message ?? ""}
              completionMessage={bot.completion_message ?? ""}
              ctaMessage={bot.cta_message ?? ""}
              questions={list}
              preview
            />
          </div>
        </div>
      )}
    </div>
  );
}
