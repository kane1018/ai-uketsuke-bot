import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/billing";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { PricingAction } from "@/components/PricingAction";
import { LegalFooter } from "@/components/LegalFooter";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { canceled?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let currentPlan: PlanId = "free";
  if (user) currentPlan = (await getEffectivePlan(user.id)).planId;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-brand-700">
            AI受付Bot
          </Link>
          <div className="flex gap-2">
            {user ? (
              <Link href="/dashboard/billing" className="btn-secondary">
                請求管理
              </Link>
            ) : (
              <Link href="/login" className="btn-ghost">
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">シンプルな月額プラン</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            まずは無料で試し、必要なBot数や回答数に合わせてアップグレードできます。
          </p>
        </div>

        {searchParams.canceled === "true" && (
          <div className="mx-auto mt-6 max-w-xl rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            お申し込みはキャンセルされました。プランは変更されていません。
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const highlighted = id === "standard";
            return (
              <section
                key={id}
                className={`card relative flex flex-col p-6 ${
                  highlighted ? "border-brand-500 ring-2 ring-brand-100" : ""
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    おすすめ
                  </span>
                )}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-3 text-3xl font-bold">
                  {plan.price.toLocaleString()}円
                  <span className="text-sm font-normal text-gray-500">/月</span>
                </p>
                <dl className="mt-5 space-y-2 text-sm">
                  <Limit label="Bot数" value={`${plan.botLimit}個`} />
                  <Limit label="月間回答数" value={`${plan.monthlyResponseLimit.toLocaleString()}件`} />
                  <Limit label="AI生成" value={`${plan.monthlyAiGenerationLimit}回`} />
                </dl>
                <ul className="my-6 flex-1 space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
                <PricingAction plan={id} loggedIn={Boolean(user)} isCurrent={currentPlan === id} />
              </section>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-gray-500">
          有料プランへ申し込む前に、
          <Link href="/terms" className="text-brand-700 underline">利用規約</Link>、
          <Link href="/privacy" className="text-brand-700 underline">プライバシーポリシー</Link>、
          <Link href="/legal" className="text-brand-700 underline">特定商取引法に基づく表記</Link>、
          <Link href="/refund-policy" className="text-brand-700 underline">解約・返金ポリシー</Link>
          をご確認ください。
        </p>
      </main>
      <LegalFooter />
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
