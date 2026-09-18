import { PLANS } from "@/lib/plans";

export const LEGAL_PENDING_VALUE = "【未確定】本番決済開始前に入力";

// Replace only the values in this object after the business owner has
// confirmed them. Do not infer personal or business information from other
// accounts, environment variables, payment data, repository metadata, or
// unrelated projects.
export const LEGAL_BUSINESS_INFO = {
  businessName: "直井寛水",
  representativeName: "直井 寛水",
  address: LEGAL_PENDING_VALUE,
  phoneNumber: "080-3366-1814",
  emailAddress: LEGAL_PENDING_VALUE,
  inquiryEmail: LEGAL_PENDING_VALUE,
  inquiryResponseTime: "平日10:00〜18:00",
} as const;

export function isPendingLegalValue(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 || normalized === LEGAL_PENDING_VALUE;
}

export function hasPendingLegalBusinessInfo() {
  return Object.values(LEGAL_BUSINESS_INFO).some(isPendingLegalValue);
}

export type LegalDisclosureItem = {
  label: string;
  value: string;
  pending?: boolean;
};

const paidPlanPrices = [
  `ライト${PLANS.light.price.toLocaleString()}円/月`,
  `スタンダード${PLANS.standard.price.toLocaleString()}円/月`,
  `プロ${PLANS.pro.price.toLocaleString()}円/月`,
].join("、");

export const LEGAL_DISCLOSURE_ITEMS: readonly LegalDisclosureItem[] = [
  {
    label: "事業者名",
    value: LEGAL_BUSINESS_INFO.businessName,
    pending: isPendingLegalValue(LEGAL_BUSINESS_INFO.businessName),
  },
  {
    label: "運営責任者",
    value: LEGAL_BUSINESS_INFO.representativeName,
    pending: isPendingLegalValue(LEGAL_BUSINESS_INFO.representativeName),
  },
  {
    label: "所在地",
    value: LEGAL_BUSINESS_INFO.address,
    pending: isPendingLegalValue(LEGAL_BUSINESS_INFO.address),
  },
  {
    label: "電話番号",
    value: LEGAL_BUSINESS_INFO.phoneNumber,
    pending: isPendingLegalValue(LEGAL_BUSINESS_INFO.phoneNumber),
  },
  {
    label: "メールアドレス",
    value: LEGAL_BUSINESS_INFO.emailAddress,
    pending: isPendingLegalValue(LEGAL_BUSINESS_INFO.emailAddress),
  },
  {
    label: "問い合わせ先",
    value: `${LEGAL_BUSINESS_INFO.inquiryEmail}（対応時間：${LEGAL_BUSINESS_INFO.inquiryResponseTime}）`,
    pending:
      isPendingLegalValue(LEGAL_BUSINESS_INFO.inquiryEmail) ||
      isPendingLegalValue(LEGAL_BUSINESS_INFO.inquiryResponseTime),
  },
  {
    label: "販売価格",
    value: `${paidPlanPrices}。表示価格が利用者の支払総額であり、これに消費税等を別途加算しません。`,
  },
  {
    label: "商品代金以外の必要料金",
    value:
      "インターネット接続料金、通信料金等は利用者の負担です。その他の費用が発生する場合は、申込み前にその内容と金額を表示します。",
  },
  { label: "支払方法", value: "クレジットカード決済（Stripe）" },
  {
    label: "支払時期",
    value:
      "初回申込時に決済し、その後は解約されるまで、各1か月の請求期間の開始時に月額料金を自動決済します。",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後、原則として直ちに有料プランを利用できます。",
  },
  {
    label: "契約期間・自動更新",
    value:
      "契約期間は1か月です。利用者が解約手続きを完了するまで、同一条件で1か月ごとに自動更新されます。",
  },
  {
    label: "解約方法・期限",
    value:
      "ログイン後の「プラン・請求」からStripe Customer Portalを開いて解約できます。次回更新を希望しない場合は、次回更新日前までに解約手続きを完了してください。",
  },
  {
    label: "解約手数料",
    value: "ありません。",
  },
  {
    label: "解約後の利用",
    value:
      "期間終了時の解約を選択した場合、原則として支払済みの請求期間の終了まで有料機能を利用できます。期間終了後は無料プランの上限が適用されます。",
  },
  {
    label: "返金・キャンセル",
    value:
      "デジタルサービスの性質上、利用者都合による支払済み料金の日割り計算・返金は原則として行いません。重複決済、請求金額の誤り、当方のシステム不具合等は個別に確認し、返金、請求取消し、利用期間延長等の適切な方法で対応します。詳細は解約・返金ポリシーをご覧ください。",
  },
  {
    label: "申込みの期間",
    value:
      "特別な申込期限はありません。期間限定の申込み条件を設ける場合は、料金ページまたは申込画面に具体的な期限を表示します。",
  },
  {
    label: "利用上限・提供条件",
    value:
      "各プランのBot数、月間回答数、AI生成回数その他の機能・上限は料金ページおよび申込画面に表示します。",
  },
  {
    label: "動作環境",
    value:
      "最新版の主要ブラウザと、JavaScriptおよびCookieを利用可能なインターネット接続環境を推奨します。",
  },
  {
    label: "表現およびサービスに関する注意",
    value:
      "AI生成内容や本サービスの利用による成果、正確性、完全性、特定目的への適合性を保証するものではありません。公開前に利用者自身で内容を確認してください。",
  },
];
