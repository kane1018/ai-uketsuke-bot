import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingOverview } from "@/lib/billing";
import { TrialNotice } from "@/components/TrialNotice";
import { BillingActions } from "@/components/BillingActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "有効",
  trialing: "無料トライアル中",
  past_due: "支払い確認中",
  canceled: "解約済み",
  incomplete: "手続き未完了",
  unpaid: "未払い",
  none: "無料プラン",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { plan, subscription, usage, trial, accessSource } = await getBillingOverview(user.id);
  const isLightTrial = accessSource === "light_trial";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">プラン・請求管理</h1>
        <p className="mt-1 text-sm text-gray-500">現在のプランと今月の利用状況を確認できます。</p>
      </div>

      {success === "true" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          お申し込みを受け付けました。プラン反映まで数秒かかる場合があります。
        </div>
      )}

      {subscription?.status === "past_due" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          お支払いの再試行中です。現時点では現在のプランを継続利用できます。
          Stripe側で未払いまたは解約状態になった場合は有料機能が停止するため、
          請求管理から支払い方法をご確認ください。
        </div>
      )}

      {trial.endsAt && accessSource !== "paid" && <TrialNotice endsAt={trial.endsAt} expired={!trial.active}/>}
      {plan.monthlyResponseLimit !== null && usage.responses >= plan.monthlyResponseLimit && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">今月の無料枠に達しています。新しい回答の受付は停止しています。翌月を待たずに再開する場合は<Link href="/pricing" className="font-semibold underline">有料プラン</Link>をご確認ください。保存済みの回答は引き続き確認できます。</div>}

      {usage.bots > plan.botLimit && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          現在{usage.bots.toLocaleString()}個のBotがあり、現在のプラン上限
          {plan.botLimit.toLocaleString()}個を超えています。既存Botは削除・停止しませんが、
          上限以下になるまで新しいBotは作成できません。iframe・ロゴ表示などの機能は
          現在のプラン条件に従います。
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">現在のプラン</p>
            <p className="mt-1 text-2xl font-bold">
              {plan.name}{isLightTrial ? "（30日無料体験）" : ""}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              状態: {isLightTrial
                ? "無料体験中（カード不要・自動課金なし）"
                : STATUS_LABELS[subscription?.status ?? "none"]}
            </p>
            {isLightTrial && trial.endsAt && (
              <p className="mt-1 text-sm text-gray-600">
                無料体験終了日時: {formatDate(trial.endsAt)}
              </p>
            )}
            {accessSource === "paid" && subscription?.current_period_end && (
              <p className="mt-1 text-sm text-gray-600">
                {subscription.cancel_at_period_end ? "利用終了日" : "次回更新日"}: {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
          <BillingActions hasCustomer={Boolean(subscription?.stripe_customer_id)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">今月の利用状況</h2>
        <p className="mb-3 text-xs leading-6 text-slate-500">回答数は日本時間の暦月で集計します。無料体験中や有料プラン中に受け取った同じ月の回答も含みます。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <UsageCard label="Bot数" used={usage.bots} limit={plan.botLimit} />
          <UsageCard label="月間回答数" used={usage.responses} limit={plan.monthlyResponseLimit} />
        </div>
      </section>
    </div>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className="card p-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">
          {used.toLocaleString()}件 <span className="text-sm font-normal text-gray-400">/ 無制限</span>
        </p>
        <p className="mt-3 text-xs text-gray-500">
          ライトプラン以上では月間回答数を制限しません。
        </p>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((used / limit) * 100));
  const reached = used >= limit;
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${reached ? "text-red-600" : ""}`}>
        {used.toLocaleString()} <span className="text-sm font-normal text-gray-400">/ {limit.toLocaleString()}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${reached ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(
    new Date(value)
  );
}
