"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "請求管理画面を開けません");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "請求管理画面を開けません");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button className="btn-primary" onClick={() => router.push("/pricing")}>
        プランを変更
      </button>
      {hasCustomer && (
        <button className="btn-secondary" onClick={openPortal} disabled={loading}>
          {loading ? "準備中..." : "支払い・請求・解約を管理"}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
