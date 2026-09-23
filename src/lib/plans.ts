export type PlanId = "free" | "light" | "standard" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "none";

export const LIGHT_TRIAL_DAYS = 30;
// The launch cutoff prevents pre-campaign accounts from receiving a retroactive trial.
// Accounts created on/after this UTC date receive exactly 30 * 24 hours of Light access.
export const LIGHT_TRIAL_LAUNCH_AT = "2026-09-20T00:00:00.000Z";

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

// Use only the server-controlled Auth creation timestamp, never editable profile data.
export function getLightTrialEndsAt(accountCreatedAt: string | null | undefined, now: Date = new Date()) {
  if (!accountCreatedAt) return null;
  const startedAt = Date.parse(accountCreatedAt);
  const end = startedAt + LIGHT_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(startedAt) || startedAt < Date.parse(LIGHT_TRIAL_LAUNCH_AT) || startedAt > now.getTime() || !Number.isFinite(new Date(end).getTime())) return null;
  return new Date(end).toISOString();
}
export function isLightTrialActive(trialEndsAt: string | null | undefined, now: Date = new Date()) {
  if (!trialEndsAt) return false;
  const end = Date.parse(trialEndsAt);
  return Number.isFinite(end) && end > now.getTime() && end <= now.getTime() + LIGHT_TRIAL_DAYS * 86400000;
}
export function resolvePlanAccess(storedPlan: unknown, status: SubscriptionStatus, trialActive: boolean): { planId: PlanId; accessSource: "paid" | "light_trial" | "free" } {
  if (isPlanId(storedPlan) && storedPlan !== "free" && hasPaidAccess(status)) return { planId: storedPlan, accessSource: "paid" };
  return trialActive ? { planId: "light", accessSource: "light_trial" } : { planId: "free", accessSource: "free" };
}
