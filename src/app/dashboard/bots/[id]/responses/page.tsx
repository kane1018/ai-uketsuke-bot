import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, answerToText } from "@/lib/utils";
import {
  responseStatusLabel,
  responseStatusClass,
} from "@/lib/constants";
import type { BotResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!bot) notFound();

  const { data: responses } = await supabase
    .from("bot_responses")
    .select("*")
    .eq("bot_id", params.id)
    .order("created_at", { ascending: false });

  const list = (responses ?? []) as BotResponse[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">回答ログ（{list.length}）</h2>
      </div>

      {list.length === 0 ? (
        <div className="card px-4 py-12 text-center text-sm text-gray-500">
          まだ回答はありません。
          <br />
          公開URLを共有して回答を集めましょう。
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 sm:hidden">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/bots/${params.id}/responses/${r.id}`}
                  className="card block p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {r.respondent_name || "（名前なし）"}
                    </span>
                    <span
                      className={`badge ${responseStatusClass(r.status)}`}
                    >
                      {responseStatusLabel(r.status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {r.respondent_email || r.respondent_phone || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDateTime(r.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="card hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">回答日時</th>
                  <th className="px-4 py-2.5 font-medium">回答者名</th>
                  <th className="px-4 py-2.5 font-medium">連絡先</th>
                  <th className="px-4 py-2.5 font-medium">回答概要</th>
                  <th className="px-4 py-2.5 font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/dashboard/bots/${params.id}/responses/${r.id}`}
                        className="block"
                      >
                        {formatDateTime(r.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {r.respondent_name || "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500">
                      <div>{r.respondent_email || "—"}</div>
                      <div>{r.respondent_phone || ""}</div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 align-top">
                      <span className="line-clamp-2 text-xs text-gray-600">
                        {r.answers
                          .map((a) => answerToText(a.value))
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`badge ${responseStatusClass(r.status)}`}
                      >
                        {responseStatusLabel(r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
