export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;
  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = "https://internal.invalid";
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

// Do not redirect an authenticated visitor back into a login/callback loop.
export function authDestination(value: string | null | undefined, fallback = "/dashboard") {
  const path = safeInternalPath(value, fallback);
  const pathname = path.split(/[?#]/)[0];
  return ["/login", "/signup", "/register"].includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/") ? fallback : path;
}
