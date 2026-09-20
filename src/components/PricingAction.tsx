"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/plans";

export function PricingAction({
  plan,
  loggedIn,
  isCurrent,
  isTrialCurrent = false,
}: {
  plan: PlanId;
  loggedIn: boolean;
  isCurrent: boolean;
  isTrialCurrent?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = PLANS[plan];

  function requestCheckout() {
    if (!loggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }
    if (plan === "free" || isCurrent) return;

    setError(null);
    setConfirming(true);
  }

  async function startCheckout() {
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
      <button className="btn-secondary w-full" onClick={requestCheckout}>
        無料で始める
      </button>
    );
  }

  return (
    <div>
      <button
        className="btn-primary w-full"
        onClick={requestCheckout}
        disabled={loading || isCurrent}
      >
        {isTrialCurrent
          ? "30日無料体験中"
          : isCurrent
            ? "現在のプラン"
            : loading
              ? "準備中..."
              : "このプランを選ぶ"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-confirm-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 id="checkout-confirm-title" className="text-xl font-bold text-gray-900">
              申込内容の確認
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Stripeの決済画面へ進む前に、継続課金の条件をご確認ください。
            </p>

            <dl className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              <ConfirmRow label="プラン" value={selectedPlan.name} />
              <ConfirmRow
                label="料金"
                value={`${selectedPlan.price.toLocaleString()}円 / 1か月`}
              />
              <ConfirmRow
                label="契約期間"
                value="1か月。解約するまで1か月ごとに自動更新"
              />
              <ConfirmRow
                label="12か月継続時の目安"
                value={`${(selectedPlan.price * 12).toLocaleString()}円`}
              />
              <ConfirmRow
                label="支払時期"
                value="初回申込時、その後は各請求期間の開始時"
              />
              <ConfirmRow
                label="提供時期"
                value="決済完了後、原則として直ちに利用可能"
              />
              <ConfirmRow
                label="解約"
                value="次回更新日前までに請求管理画面から手続。解約手数料なし"
              />
              <ConfirmRow
                label="解約後"
                value="原則として支払済み期間の終了まで有料機能を利用可能"
              />
              <ConfirmRow
                label="返金"
                value="利用者都合の日割り・返金は原則なし。重複決済・当方不具合等は個別対応"
              />
            </dl>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="mt-4 text-xs leading-6 text-gray-600">
              詳細は
              <a href="/terms" className="text-brand-700 underline">
                利用規約
              </a>
              、
              <a href="/legal" className="text-brand-700 underline">
                特定商取引法に基づく表記
              </a>
              、
              <a href="/refund-policy" className="text-brand-700 underline">
                解約・返金ポリシー
              </a>
              、
              <a href="/privacy" className="text-brand-700 underline">
                プライバシーポリシー
              </a>
              をご確認ください。
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirming(false)}
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={startCheckout}
                disabled={loading}
              >
                {loading ? "準備中..." : "Stripeで最終確認へ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[7rem_1fr]">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="text-gray-700">{value}</dd>
    </div>
  );
}
