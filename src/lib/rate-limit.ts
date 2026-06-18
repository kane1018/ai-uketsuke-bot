// Minimal in-memory rate limiter.
//
// NOTE: This is process-local and resets on redeploy. It's adequate for an MVP
// running on a single instance, and prevents trivial abuse of the public
// response-submission and AI-generation endpoints. For production scale, swap
// this for a shared store (e.g. Upstash Redis) behind the same interface.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key      unique identifier (e.g. `submit:<ip>` or `generate:<userId>`)
 * @param limit    max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Best-effort client IP from request headers (Vercel / proxies).
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

// Periodically drop expired buckets to bound memory.
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000);
  // Don't keep the event loop alive just for cleanup.
  if (typeof interval.unref === "function") interval.unref();
}
