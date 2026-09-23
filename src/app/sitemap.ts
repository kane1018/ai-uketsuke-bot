import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { USE_CASES } from "@/lib/use-cases";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/demo", "/templates", "/guide", ...USE_CASES.map((item) => `/templates/${item.slug}`)].map((path) => ({ url: `${SITE_URL}${path}` }));
}
