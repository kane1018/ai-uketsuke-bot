import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LEGAL_DISCLOSURE_ITEMS } from "@/lib/legal-info";

export const metadata: Metadata = { title: "特定商取引法に基づく表記 | AI受付Bot" };

export default function LegalPage() {
  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      description="有料プランの販売条件を、特定商取引法に基づき表示します。未確定の事業者情報は実課金開始前に必ず確定してください。"
    >
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
