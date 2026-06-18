import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLANS,
  hasPaidAccess,
  isPlanId,
  type PlanId,
  type SubscriptionStatus,
} from "@/lib/plans";
import { getStripeMode, type StripeMode } from "@/lib/stripe";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_mode: StripeMode;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageSnapshot {
  bots: number;
  responses: number;
  aiGenerations: number;
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getSubscription(userId: string, stripeMode = getStripeMode()) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("stripe_mode", stripeMode)
    .maybeSingle();

  if (error) throw new Error(`Failed to load subscription: ${error.message}`);
  return (data ?? null) as SubscriptionRecord | null;
}

export async function getEffectivePlan(userId: string) {
  const subscription = await getSubscription(userId);
  const storedPlan = subscription?.plan;
  const status = subscription?.status ?? "none";
  const planId: PlanId =
    storedPlan && isPlanId(storedPlan) && storedPlan !== "free" && hasPaidAccess(status)
      ? storedPlan
      : "free";

  return { planId, plan: PLANS[planId], subscription };
}

export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const admin = createAdminClient();
  const since = monthStartIso();

  const [botsResult, responsesResult, generationsResult] = await Promise.all([
    admin.from("bots").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("bot_responses")
      .select("id, bots!inner(user_id)", { count: "exact", head: true })
      .eq("bots.user_id", userId)
      .gte("created_at", since),
    admin
      .from("ai_generation_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
  ]);

  const error = botsResult.error || responsesResult.error || generationsResult.error;
  if (error) throw new Error(`Failed to load usage: ${error.message}`);

  return {
    bots: botsResult.count ?? 0,
    responses: responsesResult.count ?? 0,
    aiGenerations: generationsResult.count ?? 0,
  };
}

export async function getBillingOverview(userId: string) {
  const [planResult, usage] = await Promise.all([
    getEffectivePlan(userId),
    getUsageSnapshot(userId),
  ]);
  return { ...planResult, usage };
}

export async function recordUsageEvent(
  userId: string,
  eventType: "bot_created" | "response_received" | "ai_generation",
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  const { error } = await admin.from("usage_events").insert({
    user_id: userId,
    event_type: eventType,
    amount: 1,
    metadata,
  });
  if (error) console.warn("[billing] failed to record usage event:", error.message);
}
