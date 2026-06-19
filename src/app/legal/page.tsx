import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = { title: "特定商取引法に基づく表記 | AI受付Bot" };

const DISCLOSURES = [
  ["事業者名", "本番公開前に記載"],
  ["運営責任者", "本番公開前に記載"],
  ["所在地", "本番公開前に記載"],
  ["電話番号", "本番公開前に記載（請求があった場合に遅滞なく開示する方式を採用する場合は、専門家確認のうえその旨を記載）"],
  ["メールアドレス", "本番公開前に記載"],
  ["販売価格", "料金ページおよび申込画面に表示します。ライト1,980円/月、スタンダード4,980円/月、プロ9,800円/月。税込・税別の表記は本番公開前に確定します。"],
  ["商品代金以外の必要料金", "インターネット接続料金、通信料金等は利用者の負担です。その他費用が生じる場合は申込前に表示します。"],
  ["支払方法", "クレジットカード決済（Stripe）"],
  ["支払時期", "初回申込時に決済し、その後は解約されるまで各請求期間の開始時に月額料金を自動決済します。"],
  ["サービス提供時期", "決済完了後、原則として直ちに有料プランを利用できます。"],
  ["解約方法", "ログイン後の「プラン・請求」からCustomer Portalを開き、解約手続きを行います。"],
  ["返金・キャンセル", "サービスの性質上、利用者都合による支払済み料金の日割り・返金は原則行いません。重複決済や当方のシステム不具合は個別に確認します。詳細は解約・返金ポリシーをご覧ください。"],
  ["動作環境", "最新版の主要ブラウザと、JavaScriptおよびCookieを利用可能なインターネット接続環境を推奨します。"],
  ["表現および商品に関する注意書き", "AI生成内容や本サービスの利用による成果を保証するものではありません。プランの機能・上限は料金ページに表示します。"],
] as const;

export default function LegalPage() {
  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      description="有料プランの販売条件を、特定商取引法に基づき表示します。未確定の事業者情報は実課金開始前に必ず確定してください。"
    >
      <dl className="divide-y divide-gray-200 text-sm">
        {DISCLOSURES.map(([term, description]) => (
          <div key={term} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="font-semibold text-gray-900">{term}</dt>
            <dd className="text-gray-700">{description}</dd>
          </div>
        ))}
      </dl>
    </LegalPageLayout>
  );
}
