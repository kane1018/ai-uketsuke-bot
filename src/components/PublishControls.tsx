"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BotStatus } from "@/lib/types";

export function PublishControls({
  botId,
  status,
  canPublish,
  publishBlockReason,
}: {
  botId: string;
  status: BotStatus;
  canPublish: boolean;
  publishBlockReason?: string;
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setCurrentStatus(status); }, [status]);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: BotStatus) {
    if (lock.current) return;
    lock.current = true;
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
      if (!["draft", "published", "archived"].includes(data.bot?.status)) {
        router.refresh();
        throw new Error("更新結果を確認できませんでした。ページを再読み込みして公開状態を確認してください。");
      }
      setCurrentStatus(data.bot.status as BotStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="card p-4" aria-busy={loading}>
      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {currentStatus === "published" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p role="status" className="text-sm font-semibold text-green-700">● 公開中</p>
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
            <p role="status" className="text-sm font-semibold text-gray-700">
              {currentStatus === "archived" ? "アーカイブ済み" : "下書き（非公開）"}
            </p>
            <p className="text-xs text-gray-500">
              {canPublish
                ? "公開すると、共有URLから受付を利用できるようになります。"
                : publishBlockReason || "公開条件を確認してください。"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("published")}
            className="btn-primary"
            disabled={loading || !canPublish}
          >
            {loading ? "処理中..." : "受付を公開する"}
          </button>
        </div>
      )}
    </div>
  );
}
