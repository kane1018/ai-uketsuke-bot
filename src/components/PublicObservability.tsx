"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";

function isMeasuredPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/demo" ||
    pathname === "/templates" ||
    pathname.startsWith("/templates/") ||
    pathname === "/guide"
  );
}

export function PublicObservability() {
  const pathname = usePathname();
  if (!isMeasuredPublicPath(pathname)) return null;

  return (
    <>
      <Analytics
        beforeSend={(event) => {
          try {
            const eventPath = new URL(event.url, window.location.origin).pathname;
            return isMeasuredPublicPath(eventPath) ? event : null;
          } catch {
            return null;
          }
        }}
      />
      <SpeedInsights />
    </>
  );
}
