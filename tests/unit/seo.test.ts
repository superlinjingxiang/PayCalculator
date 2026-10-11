import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("build-time site URL", () => {
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
