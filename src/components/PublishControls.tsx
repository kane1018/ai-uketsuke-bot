"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BotStatus } from "@/lib/types";

export function PublishControls({
  botId,
  status,
  canPublish,
}: {
  botId: string;
  status: BotStatus;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: BotStatus) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新に失敗しました");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === "published" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-green-700">● 公開中</p>
            <p className="text-xs text-gray-500">
              訪問者は公開URLから回答できます。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("draft")}
            className="btn-secondary"
            disabled={loading}
          >
            {loading ? "処理中..." : "非公開にする"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {status === "archived" ? "アーカイブ済み" : "下書き（非公開）"}
            </p>
            <p className="text-xs text-gray-500">
              {canPublish
                ? "公開すると、公開URLと埋め込みコードが有効になります。"
                : "公開するには、質問を1つ以上作成してください。"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("published")}
            className="btn-primary"
            disabled={loading || !canPublish}
          >
            {loading ? "処理中..." : "🚀 公開する"}
          </button>
        </div>
      )}
    </div>
  );
}
