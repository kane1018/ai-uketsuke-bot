import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] shared limiter failed:", error.message);
    // Fail closed on public/cost-bearing endpoints when the limiter is unavailable.
    return { success: false, remaining: 0, resetAt: Date.now() + windowMs };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : Date.now() + windowMs;
  return {
    success: Boolean(row?.allowed),
    remaining: Number(row?.remaining ?? 0),
    resetAt,
  };
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
