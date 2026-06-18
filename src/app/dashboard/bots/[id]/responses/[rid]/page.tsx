import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, answerToText } from "@/lib/utils";
import { questionTypeLabel } from "@/lib/constants";
import { ResponseStatusSelect } from "@/components/ResponseStatusSelect";
import type { BotResponse, ResponseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResponseDetailPage({
  params,
}: {
  params: { id: string; rid: string };
}) {
  const supabase = createClient();

  const { data: response } = await supabase
    .from("bot_responses")
    .select("*")
    .eq("id", params.rid)
    .eq("bot_id", params.id)
    .single();

  if (!response) notFound();

  const r = response as BotResponse;

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/bots/${params.id}/responses`}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← 回答ログ一覧に戻る
      </Link>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">回答詳細</h2>
            <p className="text-xs text-gray-500">
              {formatDateTime(r.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ステータス</span>
            <ResponseStatusSelect
              responseId={r.id}
              current={r.status as ResponseStatus}
            />
          </div>
        </div>
      </div>

      {/* Contact summary */}
      <div className="card divide-y divide-gray-100">
        <Row label="回答者名" value={r.respondent_name || "—"} />
        <Row label="メール" value={r.respondent_email || "—"} email />
        <Row label="電話番号" value={r.respondent_phone || "—"} />
      </div>

      {/* Full answers */}
      <div className="card">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold">
          回答内容
        </h3>
        <div className="divide-y divide-gray-100">
          {r.answers.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500">
              回答がありません。
            </p>
          )}
          {r.answers.map((a, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {a.question_text}
                </p>
                <span className="badge bg-gray-100 text-gray-500">
                  {questionTypeLabel(a.question_type)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                {answerToText(a.value) || (
                  <span className="text-gray-400">（無回答）</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  email,
}: {
  label: string;
  value: string;
  email?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      {email && value !== "—" ? (
        <a
          href={`mailto:${value}`}
          className="break-words text-sm text-brand-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="break-words text-sm text-gray-800">{value}</span>
      )}
    </div>
  );
}
