import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo";

export const dynamic = "force-static";

const paths = ["/", "/salary-calculator/", "/shanghai-salary-calculator/", "/methodology/", "/policy-sources/", "/privacy/", "/about/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  if (!origin) return [];
  return paths.map((path) => ({ url: new URL(path, origin).toString(), lastModified: ["/policy-sources/", "/about/"].includes(path) ? "2026-10-11" : "2026-10-27", changeFrequency: "monthly", priority: path === "/" ? 1 : 0.7 }));
}
