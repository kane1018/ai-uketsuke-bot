import type { QuestionType } from "@/lib/types";

// ---------------------------------------------------------------------
// Purposes (目的) — shown as cards in the creation wizard.
// ---------------------------------------------------------------------
export const PURPOSES = [
  {
    value: "inquiry",
    label: "問い合わせ対応",
    description: "よくある質問や問い合わせを受け付けます",
    icon: "💬",
  },
  {
    value: "consultation",
    label: "相談受付",
    description: "相談内容を事前にヒアリングします",
    icon: "📝",
  },
  {
    value: "lead",
    label: "見込み客獲得",
    description: "興味のあるお客様の情報を集めます",
    icon: "🎯",
  },
  {
    value: "diagnosis",
    label: "診断コンテンツ",
    description: "質問に答えるとおすすめを提案します",
    icon: "🔍",
  },
  {
    value: "recruit",
    label: "採用応募受付",
    description: "応募者の情報や希望を受け付けます",
    icon: "🧑‍💼",
  },
] as const;

export type PurposeValue = (typeof PURPOSES)[number]["value"];

// ---------------------------------------------------------------------
// Industries (業種)
// ---------------------------------------------------------------------
export const INDUSTRIES = [
  {
    value: "professional",
    label: "士業",
    description: "行政書士・税理士・社労士など",
    icon: "⚖️",
  },
  {
    value: "realestate",
    label: "不動産",
    description: "売買・賃貸・管理など",
    icon: "🏠",
  },
  {
    value: "recruiting",
    label: "採用・人材",
    description: "採用・人材紹介・派遣など",
    icon: "🤝",
  },
  {
    value: "other",
    label: "その他",
    description: "店舗・サロン・BtoBなど",
    icon: "✨",
  },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

// ---------------------------------------------------------------------
// Question types (回答形式)
// ---------------------------------------------------------------------
export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  hasOptions: boolean;
}[] = [
  { value: "text", label: "短いテキスト", hasOptions: false },
  { value: "textarea", label: "長いテキスト", hasOptions: false },
  { value: "single", label: "単一選択", hasOptions: true },
  { value: "multiple", label: "複数選択", hasOptions: true },
  { value: "email", label: "メールアドレス", hasOptions: false },
  { value: "phone", label: "電話番号", hasOptions: false },
  { value: "date", label: "日付", hasOptions: false },
];

export const RESPONSE_STATUSES: {
  value: "new" | "contacted" | "closed";
  label: string;
  className: string;
}[] = [
  { value: "new", label: "新規", className: "bg-brand-100 text-brand-800" },
  {
    value: "contacted",
    label: "対応中",
    className: "bg-amber-100 text-amber-800",
  },
  { value: "closed", label: "完了", className: "bg-gray-200 text-gray-700" },
];

// ---------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------
export function purposeLabel(value: string): string {
  return PURPOSES.find((p) => p.value === value)?.label ?? value;
}

export function industryLabel(value: string): string {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}

export function questionTypeLabel(value: string): string {
  return QUESTION_TYPES.find((q) => q.value === value)?.label ?? value;
}

export function questionTypeHasOptions(value: QuestionType): boolean {
  return QUESTION_TYPES.find((q) => q.value === value)?.hasOptions ?? false;
}

export function responseStatusLabel(value: string): string {
  return RESPONSE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function responseStatusClass(value: string): string {
  return (
    RESPONSE_STATUSES.find((s) => s.value === value)?.className ??
    "bg-gray-100 text-gray-700"
  );
}
