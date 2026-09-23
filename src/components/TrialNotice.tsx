import Link from "next/link";
export function TrialNotice({endsAt,expired=false}:{endsAt:string;expired?:boolean}){
  const formatted=new Intl.DateTimeFormat("ja-JP",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tokyo"}).format(new Date(endsAt));
  const days=Math.max(0,Math.ceil((Date.parse(endsAt)-Date.now())/86400000));
  return <aside className={`rounded-xl border p-4 sm:p-5 ${expired?"border-slate-200 bg-white":"border-brand-200 bg-brand-50"}`} aria-label="無料体験について"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{expired?"無料体験が終了し、無料プランになりました":`ライト無料体験中 — あと${days}日`}</p><p className="mt-1 text-xs leading-6 text-slate-600">{expired?"終了日時":"無料体験の終了日時"}：{formatted}（日本時間）</p></div><Link href={expired?"/pricing":"/dashboard/billing"} className="btn-secondary">{expired?"月980円でライトを続ける":"体験・プランを確認"}</Link></div><p className="mt-3 text-sm leading-7 text-slate-600">自動課金はありません。{expired?"保存済みのBot・回答と公開URLは残ります。受付は月30回答まで、埋め込み表示は停止します。":"30日後は無料プラン（Bot1個・月30回答・埋め込み不可）へ。Botや保存した回答は削除しません。"} <Link href="/guide#trial" className="text-brand-700 underline">詳しく見る</Link></p></aside>;
}
