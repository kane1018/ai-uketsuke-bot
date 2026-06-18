export type PlanId = "free" | "light" | "standard" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "none";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  botLimit: number;
  monthlyResponseLimit: number;
  monthlyAiGenerationLimit: number;
  iframeEnabled: boolean;
  brandingVisible: boolean;
  features: string[];
}

export const PLAN_ORDER: PlanId[] = ["free", "light", "standard", "pro"];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "無料",
    price: 0,
    botLimit: 1,
    monthlyResponseLimit: 30,
    monthlyAiGenerationLimit: 3,
    iframeEnabled: false,
    brandingVisible: true,
    features: ["メール通知", "公開URL", "AI受付Botロゴ表示"],
  },
  light: {
    id: "light",
    name: "ライト",
    price: 1980,
    botLimit: 1,
    monthlyResponseLimit: 300,
    monthlyAiGenerationLimit: 30,
    iframeEnabled: true,
    brandingVisible: true,
    features: ["メール通知", "公開URL", "iframe埋め込み"],
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    price: 4980,
    botLimit: 3,
    monthlyResponseLimit: 1000,
    monthlyAiGenerationLimit: 100,
    iframeEnabled: true,
    brandingVisible: false,
    features: ["メール通知", "公開URL", "iframe埋め込み", "ロゴ非表示"],
  },
  pro: {
    id: "pro",
    name: "プロ",
    price: 9800,
    botLimit: 10,
    monthlyResponseLimit: 3000,
    monthlyAiGenerationLimit: 300,
    iframeEnabled: true,
    brandingVisible: false,
    features: ["メール通知", "公開URL", "iframe埋め込み", "ロゴ非表示"],
  },
};

export const PAID_PLANS: Exclude<PlanId, "free">[] = ["light", "standard", "pro"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_ORDER.includes(value as PlanId);
}

export function hasPaidAccess(status: SubscriptionStatus) {
  return status === "active" || status === "trialing" || status === "past_due";
}
