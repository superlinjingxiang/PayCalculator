import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("build-time site URL", () => {
  it("keeps the preview sitemap empty including the Shanghai route", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.resetModules();
    const { default: sitemap } = await import("@/app/sitemap");
    expect(sitemap()).toEqual([]);
  });

  it("includes the Shanghai route with its own real-origin URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paytools.cn");
    vi.resetModules();
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.find((entry) => entry.url.endsWith("/shanghai-salary-calculator/"))?.url).toBe("https://paytools.cn/shanghai-salary-calculator/");
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
  });
  it.each(["", "http://paytools.cn", "https://example.com", "https://demo.example.org", "https://paytools.test", "https://localhost", "https://127.0.0.1", "https://paytools.cn/path", "https://user:password@paytools.cn", "https://[::ffff:192.0.2.1]"])("rejects placeholder or invalid origin %s", async (value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    vi.resetModules();
    const { getSiteOrigin, pageMetadata } = await import("@/lib/seo");
    expect(getSiteOrigin()).toBeNull();
    expect(pageMetadata("工资计算器", "说明", "/salary-calculator/").alternates).toBeUndefined();
  });

  it("creates a canonical only for a real HTTPS origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paytools.cn");
    vi.resetModules();
    const { getSiteOrigin, pageMetadata } = await import("@/lib/seo");
    expect(getSiteOrigin()).toBe("https://paytools.cn");
    expect(pageMetadata("工资计算器", "说明", "/salary-calculator/").alternates).toEqual({
      canonical: "https://paytools.cn/salary-calculator/",
    });
  });
});
