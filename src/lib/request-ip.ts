function firstForwardedIp(value: string | null) {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function getClientIp(headers: Headers): string {
  // Vercel preserves the requester IP in this header even when another proxy
  // sits in front of the deployment. Prefer it over generic forwarded headers.
  const realIp = headers.get("x-real-ip")?.trim();
  return (
    firstForwardedIp(headers.get("x-vercel-forwarded-for")) ??
    firstForwardedIp(headers.get("x-forwarded-for")) ??
    (realIp || "unknown")
  );
}
