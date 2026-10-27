import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPath, createAnalyticsTracker, getAnalyticsConfig, safeSourceDomain } from "@/lib/analytics";
const ID = "a45801cb-c783-403d-972f-c95f412d4a77";
const context = { hostname: "127.0.0.1", language: "zh-CN", screen: "360x800", referrer: "https://www.baidu.com/s?wd=SALARY#secret" };
afterEach(() => vi.unstubAllEnvs());
describe("Umami integration boundaries", () => {
  it("requires the selected provider and valid public UUID", () => {
    expect(getAnalyticsConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "umami");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WEBSITE_ID", "https://arbitrary.invalid/script");
    expect(getAnalyticsConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WEBSITE_ID", ID);
    expect(getAnalyticsConfig()).toEqual({ websiteId: ID });
  });
  it("allows only seven page paths, removing search and hash", () => {
    expect(analyticsPath("/salary-calculator?salary=SALARY#result")).toBe("/salary-calculator/");
    for (const path of ["/unknown/", "/salary/8000", "/__proto__", "/_next/static/a.js"]) expect(analyticsPath(path)).toBeNull();
  });
  it("keeps only approved source root domains", () => {
    expect(safeSourceDomain(context.referrer, context.hostname)).toBe("https://baidu.com");
    for (const source of ["https://baidu.com.evil.invalid/", "https://user:salary@baidu.com/", "javascript:alert(1)", "https://private.invalid/SALARY", "http://127.0.0.1/?salary=8"]) expect(safeSourceDomain(source, context.hostname)).toBe("");
  });
  it("queues route snapshots without duplicate rerenders or delayed wrong attribution", () => {
    const tracker = createAnalyticsTracker(ID, context);
    const track = vi.fn();
    tracker.visit("/"); tracker.visit("/?salary=SALARY"); tracker.visit("/methodology/"); tracker.visit("/");
    tracker.ready({ track }); tracker.ready({ track });
    expect(track.mock.calls.map(([payload]) => payload.url)).toEqual(["/", "/methodology/", "/"]);
    expect(track.mock.calls.map(([payload]) => payload.referrer)).toEqual(["https://baidu.com", "", ""]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("SALARY");
    expect(Object.keys(track.mock.calls[0][0]).sort()).toEqual(["hostname", "language", "referrer", "screen", "title", "url", "website"]);
  });
  it("does not throw or replay when tracking fails", async () => {
    const tracker = createAnalyticsTracker(ID, context);
    const track = vi.fn().mockRejectedValue(new Error("offline"));
    tracker.ready({ track }); tracker.visit("/"); tracker.ready({ track });
    await Promise.resolve();
    expect(track).toHaveBeenCalledTimes(1);
  });
});
