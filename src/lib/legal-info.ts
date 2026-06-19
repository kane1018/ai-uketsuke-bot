export const LEGAL_PENDING_VALUE = "【未確定】本番決済開始前に入力";

// Replace only the values in this object after the business owner has
// confirmed them. Do not infer personal or business information from other
// accounts, environment variables, payment data, or repository metadata.
export const LEGAL_BUSINESS_INFO = {
  businessName: LEGAL_PENDING_VALUE,
  representativeName: LEGAL_PENDING_VALUE,
  address: LEGAL_PENDING_VALUE,
  phoneNumber: LEGAL_PENDING_VALUE,
  emailAddress: LEGAL_PENDING_VALUE,
  inquiryEmail: LEGAL_PENDING_VALUE,
  inquiryResponseTime: LEGAL_PENDING_VALUE,
  taxDisplay: LEGAL_PENDING_VALUE,
  stripePublicBusinessName: LEGAL_PENDING_VALUE,
} as const;

export type LegalDisclosureItem = {
  label: string;
  value: string;
  pending?: boolean;
};

export const LEGAL_DISCLOSURE_ITEMS: readonly LegalDisclosureItem[] = [
  { label: "事業者名", value: LEGAL_BUSINESS_INFO.businessName, pending: true },
  { label: "運営責任者", value: LEGAL_BUSINESS_INFO.representativeName, pending: true },
  { label: "所在地", value: LEGAL_BUSINESS_INFO.address, pending: true },
  {
    label: "電話番号",
    value: `${LEGAL_BUSINESS_INFO.phoneNumber}（開示方法を含め、専門家確認のうえ確定）`,
    pending: true,
  },
  { label: "メールアドレス", value: LEGAL_BUSINESS_INFO.emailAddress, pending: true },
  {
    label: "問い合わせ先",
    value: `${LEGAL_BUSINESS_INFO.inquiryEmail}（対応時間：${LEGAL_BUSINESS_INFO.inquiryResponseTime}）`,
    pending: true,
  },
  {
    label: "販売価格",
    value: `料金ページおよび申込画面に表示します。ライト1,980円/月、スタンダード4,980円/月、プロ9,800円/月。税表示：${LEGAL_BUSINESS_INFO.taxDisplay}`,
    pending: true,
  },
  {
    label: "商品代金以外の必要料金",
    value:
      "インターネット接続料金、通信料金等は利用者の負担です。その他費用が生じる場合は申込前に表示します。",
  },
  { label: "支払方法", value: "クレジットカード決済（Stripe）" },
  {
    label: "支払時期",
    value:
      "初回申込時に決済し、その後は解約されるまで各請求期間の開始時に月額料金を自動決済します。",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後、原則として直ちに有料プランを利用できます。",
  },
  {
    label: "解約方法",
    value: "ログイン後の「プラン・請求」からCustomer Portalを開き、解約手続きを行います。",
  },
  {
    label: "返金・キャンセル",
    value:
      "サービスの性質上、利用者都合による支払済み料金の日割り・返金は原則行いません。重複決済や当方のシステム不具合は個別に確認します。詳細は解約・返金ポリシーをご覧ください。",
  },
  {
    label: "動作環境",
    value:
      "最新版の主要ブラウザと、JavaScriptおよびCookieを利用可能なインターネット接続環境を推奨します。",
  },
  {
    label: "Stripe上の公開ビジネス名",
    value: LEGAL_BUSINESS_INFO.stripePublicBusinessName,
    pending: true,
  },
  {
    label: "表現および商品に関する注意書き",
    value:
      "AI生成内容や本サービスの利用による成果を保証するものではありません。プランの機能・上限は料金ページに表示します。",
  },
];
