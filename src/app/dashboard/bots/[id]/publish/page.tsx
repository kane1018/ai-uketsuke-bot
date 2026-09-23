import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublishControls } from "@/components/PublishControls";
import { CopyButton } from "@/components/CopyButton";
import { publicChatUrl, embedUrl, embedCode } from "@/lib/utils";
import type { BotStatus } from "@/lib/types";
import { getEffectivePlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [botResult, questionsResult, { plan, trial, accessSource }] = await Promise.all([
    supabase.from("bots").select("id, status, public_slug, company_name").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("bot_questions").select("id", { count: "exact", head: true }).eq("bot_id", id),
    getEffectivePlan(user.id),
  ]);
  const bot = botResult.data;
  if (!bot) notFound();
  const questionCheckFailed = Boolean(questionsResult.error) || questionsResult.count === null;
  const hasQuestions = !questionCheckFailed && (questionsResult.count ?? 0) > 0;
  const hasOperatorName = Boolean(bot.company_name?.trim());
  const canPublish = hasQuestions && hasOperatorName;
  const publishBlockReason = questionCheckFailed
    ? "質問の保存状態を確認できませんでした。ページを再読み込みしてください。"
    : !hasQuestions && !hasOperatorName
      ? "質問を1つ以上保存し、基本情報に会社・事業者名を入力してください。"
      : !hasQuestions
        ? "質問を1つ以上保存してください。"
        : !hasOperatorName ? "基本情報に会社・事業者名を入力してください。" : undefined;
  const isPublished = bot.status === "published";
  const chatUrl = publicChatUrl(bot.public_slug);
  const iframeUrl = embedUrl(bot.public_slug);
  const iframe = embedCode(bot.public_slug);
  const base = `/dashboard/bots/${bot.id}`;

  return <div className="space-y-6">
    <ol aria-label="公開の手順" className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
      <li><Link href={`${base}/preview`} className="text-brand-700 underline">1. 動作確認</Link></li>
      <li aria-current={!isPublished ? "step" : undefined}>2. 公開</li>
      <li aria-current={isPublished ? "step" : undefined}>3. URLを共有</li>
    </ol>
    <section className="space-y-3" aria-labelledby="publish-heading">
      <div><h2 id="publish-heading" className="text-lg font-bold">確認できたら、受付を公開しましょう</h2>
        <p className="mt-1 text-sm text-gray-600">動作確認で質問を最後まで試してから、公開ボタンを押してください。</p></div>
      {!canPublish && <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">公開前に確認が必要です</p><p>{publishBlockReason}</p>
        <div className="flex flex-wrap gap-3">
          {!hasOperatorName && <Link href={`${base}/settings`} className="font-semibold underline">会社・事業者名を設定する →</Link>}
          {!hasQuestions && <Link href={`${base}/edit`} className="font-semibold underline">質問を編集・保存する →</Link>}
        </div>
      </div>}
      <PublishControls botId={bot.id} status={bot.status as BotStatus} canPublish={canPublish} publishBlockReason={publishBlockReason} />
    </section>
    <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="share-heading">
      <div><h2 id="share-heading" className="font-bold">URLをコピーして、お客様に共有</h2>
        <p className="mt-1 text-sm text-gray-600">メール・SNS・ホームページのリンクに貼り付けるだけで受付を始められます。サイトへの埋め込みは不要です。</p></div>
      <label htmlFor="public-chat-url" className="label">共有する受付URL</label>
      <input id="public-chat-url" readOnly value={chatUrl} className="input font-mono text-sm" />
      <div className="flex flex-wrap items-start gap-3">
        <CopyButton value={chatUrl} label="受付URLをコピー" className="btn-primary" />
        {isPublished && <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">公開した受付を開く ↗</a>}
      </div>
      {!isPublished && <p className="text-sm text-amber-700">このURLはまだ利用できません。上の「受付を公開する」を押してから共有してください。</p>}
      <div className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
        <p>動作確認画面の回答は保存されません。公開URLや埋め込み画面から送信したテスト回答は、実際の回答として保存され、回答件数に含まれます。</p>
        <Link href={`${base}/responses`} className="mt-2 inline-block font-medium text-brand-700 underline">届いた回答を確認する →</Link>
      </div>
    </section>
    <details className="card p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold">任意：自社サイトの中に受付画面を設置する</summary>
      <p className="mt-3 text-sm text-gray-600">サイト内に受付画面を表示する「埋め込み（iframe）」です。サイトのHTMLを編集できる方、または制作担当者が設定してください。</p>
      <Link href="/guide#install" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">設置手順を見る →</Link>
      {plan.iframeEnabled ? <>
        {accessSource === "light_trial" && trial.endsAt && <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">埋め込みはライトプランのお試し期間中です</p>
          <p className="mt-1">{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(new Date(trial.endsAt))}（日本時間）に終了します。有料プランを契約しない場合、無料プランに戻り、設置済みの埋め込みは利用できなくなります。公開URLでの受付は無料プランの範囲で継続できます。</p>
          <Link href="/pricing" className="mt-2 inline-block font-semibold underline">継続するプランを確認する</Link>
        </div>}
        <label htmlFor="embed-code" className="label mt-4">サイトに貼り付けるコード</label>
        <textarea id="embed-code" readOnly value={iframe} rows={5} className="input font-mono text-xs" />
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <CopyButton value={iframe} label="埋め込みコードをコピー" />
          {isPublished && <a href={iframeUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">埋め込み画面を開く ↗</a>}
        </div>
        {!isPublished && <p className="mt-3 text-sm text-amber-700">埋め込み画面も、受付を公開してから利用できます。</p>}
      </> : <div className="mt-4 rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
        <p>サイトへの埋め込みはライトプラン以上で利用できます。URLの共有は現在のプランで利用できます。</p>
        <Link href="/pricing" className="mt-2 inline-block font-semibold underline">プランを確認する</Link>
      </div>}
    </details>
    <div className="flex flex-wrap gap-4 text-sm text-brand-700">
      <Link href={`${base}/preview`} className="underline">動作をもう一度確認する</Link>
      <Link href={`${base}/edit`} className="underline">質問を編集する</Link>
      <Link href={`${base}/settings`} className="underline">基本情報・通知先を修正する</Link>
    </div>
  </div>;
}
