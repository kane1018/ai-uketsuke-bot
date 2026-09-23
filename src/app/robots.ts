import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  // Customer forms are crawlable so crawlers can see their X-Robots-Tag:noindex.
  // Authentication, not robots.txt, protects the dashboard.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
