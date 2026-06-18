"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RESPONSE_STATUSES } from "@/lib/constants";
import type { ResponseStatus } from "@/lib/types";

export function ResponseStatusSelect({
  responseId,
  current,
}: {
  responseId: string;
  current: ResponseStatus;
}) {
  const router = useRouter();
  const [status, setStatusState] = useState<ResponseStatus>(current);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function change(next: ResponseStatus) {
    const prev = status;
    setStatusState(next);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/responses/${responseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch {
      setStatusState(prev); // revert on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="input w-auto"
        value={status}
        disabled={saving}
        onChange={(e) => change(e.target.value as ResponseStatus)}
      >
        {RESPONSE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {saved && <span className="text-xs text-green-600">✓ 更新しました</span>}
    </div>
  );
}
