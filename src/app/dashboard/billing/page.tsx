import { createClient } from "@/lib/supabase/server";
import { getBillingOverview } from "@/lib/billing";
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
  searchParams: { success?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { plan, subscription, usage } = await getBillingOverview(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">プラン・請求管理</h1>
        <p className="mt-1 text-sm text-gray-500">現在のプランと今月の利用状況を確認できます。</p>
      </div>

      {searchParams.success === "true" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          お申し込みを受け付けました。プラン反映まで数秒かかる場合があります。
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">現在のプラン</p>
            <p className="mt-1 text-2xl font-bold">{plan.name}</p>
            <p className="mt-1 text-sm text-gray-600">
              ステータス: {STATUS_LABELS[subscription?.status ?? "none"]}
            </p>
            {subscription?.current_period_end && (
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
        <div className="grid gap-3 sm:grid-cols-3">
          <UsageCard label="Bot数" used={usage.bots} limit={plan.botLimit} />
          <UsageCard label="月間回答数" used={usage.responses} limit={plan.monthlyResponseLimit} />
          <UsageCard label="AI生成回数" used={usage.aiGenerations} limit={plan.monthlyAiGenerationLimit} />
        </div>
      </section>
    </div>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number }) {
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
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" }).format(
    new Date(value)
  );
}
