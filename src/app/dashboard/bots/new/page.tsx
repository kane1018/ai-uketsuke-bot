import Link from "next/link";
import { redirect } from "next/navigation";
import { NewBotWizard } from "@/components/NewBotWizard";
import { getEffectivePlan } from "@/lib/billing";
import { INDUSTRIES, PURPOSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewBotPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string | string[]; industry?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ plan }, bots, query] = await Promise.all([
    getEffectivePlan(user.id),
    supabase.from("bots").select("id, name", { count: "exact" })
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    searchParams,
  ]);
  if (bots.error || bots.count === null) {
    return <div className="card mx-auto max-w-2xl space-y-3 p-6">
      <h1 className="text-xl font-bold">作成可能な数を確認できませんでした</h1>
      <p className="text-sm text-gray-600">時間をおいてページを再読み込みしてください。</p>
      <Link href="/dashboard/bots" className="btn-secondary">Bot一覧に戻る</Link>
    </div>;
  }
  const full = bots.count >= plan.botLimit;
  const purpose = PURPOSES.find((item) => item.value === query.purpose)?.value;
  const industry = INDUSTRIES.find((item) => item.value === query.industry)?.value;

  return <div className="mx-auto max-w-2xl space-y-6">
    <div className="card space-y-2 p-4 text-sm">
      <p className="font-semibold">{plan.name}プラン：{bots.count} / {plan.botLimit}個のBotを利用中</p>
      <p className="text-gray-600">{full ? "作成数の上限に達しています。既存のBotを編集して、受付の準備を続けられます。" : `あと${plan.botLimit - bots.count}個作成できます。まずは下書きとして作成します。`}</p>
    </div>
    {full ? <section className="card space-y-4 p-6">
      <h1 className="text-xl font-bold">既存のBotから続ける</h1>
      <ul className="space-y-2">{bots.data?.map((bot) => <li key={bot.id}>
        <Link href={`/dashboard/bots/${bot.id}/edit`} className="block rounded-lg border border-gray-200 px-4 py-3 font-medium text-brand-700 hover:bg-brand-50">{bot.name || "名前未設定のBot"} を編集 →</Link>
      </li>)}</ul>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/bots" className="btn-secondary">Bot一覧を見る</Link>
        <Link href="/pricing" className="btn-ghost">作成数を増やすプランを見る</Link>
      </div>
    </section> : <NewBotWizard defaultEmail={user.email ?? ""} initialPurpose={purpose} initialIndustry={industry} />}
  </div>;
}
