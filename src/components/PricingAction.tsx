"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanId } from "@/lib/plans";

export function PricingAction({
  plan,
  loggedIn,
  isCurrent,
}: {
  plan: PlanId;
  loggedIn: boolean;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!loggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }
    if (plan === "free" || isCurrent) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.portalRequired) {
          router.push("/dashboard/billing");
          return;
        }
        throw new Error(data.error || "Checkoutを開始できません");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkoutを開始できません");
      setLoading(false);
    }
  }

  if (plan === "free") {
    return loggedIn ? (
      <button className="btn-secondary w-full" disabled>
        {isCurrent ? "現在のプラン" : "無料プラン"}
      </button>
    ) : (
      <button className="btn-secondary w-full" onClick={startCheckout}>
        無料で始める
      </button>
    );
  }

  return (
    <div>
      <button
        className="btn-primary w-full"
        onClick={startCheckout}
        disabled={loading || isCurrent}
      >
        {isCurrent ? "現在のプラン" : loading ? "準備中..." : "このプランを選ぶ"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
