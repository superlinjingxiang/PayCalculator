import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo";

export const dynamic = "force-static";

const paths = ["/", "/salary-calculator/", "/methodology/", "/policy-sources/", "/privacy/", "/about/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  if (!origin) return [];
  return paths.map((path) => ({ url: new URL(path, origin).toString(), lastModified: "2026-10-11", changeFrequency: "monthly", priority: path === "/" ? 1 : 0.7 }));
}
