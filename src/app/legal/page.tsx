import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import {
  LEGAL_DISCLOSURE_ITEMS,
  hasPendingLegalBusinessInfo,
} from "@/lib/legal-info";

export const metadata: Metadata = { title: "特定商取引法に基づく表記 | AI受付Bot" };

export default function LegalPage() {
  const hasPendingInfo = hasPendingLegalBusinessInfo();

  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      description={
        hasPendingInfo
          ? "有料プランの販売条件を表示します。未確定の事業者情報は本番決済開始前に必ず確定してください。"
          : "有料プランの販売条件を、特定商取引法に基づき表示します。"
      }
    >
      {hasPendingInfo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          現在、事業者の本人確認情報に未確定項目があります。
          本番決済は、すべての項目を確定するまで開始できません。
        </div>
      )}

      <dl className="divide-y divide-gray-200 text-sm">
        {LEGAL_DISCLOSURE_ITEMS.map((item) => (
          <div key={item.label} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="font-semibold text-gray-900">{item.label}</dt>
            <dd className={item.pending ? "font-semibold text-amber-800" : "text-gray-700"}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </LegalPageLayout>
  );
}
