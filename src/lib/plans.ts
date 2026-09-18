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
  monthlyResponseLimit: number | null;
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
    iframeEnabled: false,
    brandingVisible: true,
    features: ["メール通知", "公開URL", "受付Botロゴ表示"],
  },
  light: {
    id: "light",
    name: "ライト",
    price: 980,
    botLimit: 1,
    monthlyResponseLimit: null,
    iframeEnabled: true,
    brandingVisible: true,
    features: ["メール通知", "公開URL", "iframe埋め込み", "回答数無制限"],
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    price: 1980,
    botLimit: 3,
    monthlyResponseLimit: null,
    iframeEnabled: true,
    brandingVisible: false,
    features: ["メール通知", "公開URL", "iframe埋め込み", "ロゴ非表示", "回答数無制限"],
  },
  pro: {
    id: "pro",
    name: "プロ",
    price: 3980,
    botLimit: 10,
    monthlyResponseLimit: null,
    iframeEnabled: true,
    brandingVisible: false,
    features: ["メール通知", "公開URL", "iframe埋め込み", "ロゴ非表示", "回答数無制限"],
  },
};

export const PAID_PLANS: Exclude<PlanId, "free">[] = ["light", "standard", "pro"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_ORDER.includes(value as PlanId);
}

export function hasPaidAccess(status: SubscriptionStatus) {
  return status === "active" || status === "trialing" || status === "past_due";
}
