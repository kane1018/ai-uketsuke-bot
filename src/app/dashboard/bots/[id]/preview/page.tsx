import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatForm } from "@/components/ChatForm";
import type { BotQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, name, company_name, opening_message, completion_message, cta_message")
    .eq("id", id)
    .single();

  if (!bot) notFound();

  const { data: questions, error: questionsError } = await supabase
    .from("bot_questions")
    .select("*")
    .eq("bot_id", id)
    .order("sort_order", { ascending: true });

  const list = (questions ?? []) as BotQuestion[];

  return (
    <div className="space-y-4">
      <ol aria-label="公開の手順" className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
        <li aria-current="step" className="text-brand-700">1. 動作確認</li>
        <li>2. 公開</li><li>3. URLを共有</li>
      </ol>
      <div className="card space-y-2 p-4">
        <h2 className="font-bold">お客様のつもりで、最後まで回答してみましょう</h2>
        <p className="text-sm text-gray-600">質問の順番・選択肢・回答後の案内を確認してください。ここには保存済みの内容が表示されます。</p>
        <p className="text-sm font-medium text-brand-700">この動作確認では回答は保存されず、通知メールも送られません。</p>
        <p className="text-xs text-gray-500">公開URLから送信するテスト回答は、実際の回答として保存されます。</p>
      </div>
      {!bot.company_name?.trim() && <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        公開には会社・事業者名の設定が必要です。
        <Link href={`/dashboard/bots/${bot.id}/settings`} className="ml-2 font-semibold underline">基本情報を設定する →</Link>
      </div>}

      {questionsError ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">質問を読み込めませんでした。ページを再読み込みしてください。</p>
      ) : list.length === 0 ? (
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
          <div className="h-[min(640px,75dvh)] min-h-[360px] overflow-hidden rounded-2xl border border-gray-300 shadow-lg">
            <ChatForm
              key={list.map((q) => q.id).join(",")}
              slug=""
              botName={bot.name}
              operatorName={bot.company_name || bot.name}
              openingMessage={bot.opening_message ?? ""}
              completionMessage={bot.completion_message ?? ""}
              ctaMessage={bot.cta_message ?? ""}
              questions={list}
              preview
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <Link href={`/dashboard/bots/${bot.id}/edit`} className="btn-secondary">質問を修正する</Link>
        {!questionsError && list.length > 0 && <Link href={`/dashboard/bots/${bot.id}/publish`} className="btn-primary">確認できたら公開へ →</Link>}
      </div>
    </div>
  );
}
