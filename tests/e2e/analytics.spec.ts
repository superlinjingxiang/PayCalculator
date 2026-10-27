import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function trackerSource() {
  const source = await readFile("tests/fixtures/umami-v3.4.1-tracker.ts.txt", "utf8");
  // Upstream exports are types only; remove the module marker before creating
  // a classic browser script, matching Umami's tracker build entry point.
  return ts.transpileModule(source.replace(/^export /gm, "").replaceAll("__COLLECT_API_HOST__", "").replaceAll("__COLLECT_API_ENDPOINT__", "/api/send"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
}

async function intercept(page: Page, source: string) {
  const payloads: Array<Record<string, unknown>> = [];
  await page.route("**/analytics/script.js", (route) => route.fulfill({ contentType: "application/javascript", body: source }));
  await page.route("**/analytics/api/send", async (route) => {
    const request = route.request();
    expect(request.headers().cookie).toBeUndefined();
    expect(request.headers().referer).toBeUndefined();
    const event = request.postDataJSON();
    expect(event.type).toBe("event");
    payloads.push(event.payload);
    await route.fulfill({ contentType: "application/json", body: '{"cache":"test-session"}' });
  });
  return payloads;
}

test("unconfigured analytics makes no script or send requests", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "umami");
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/analytics/")) requests.push(request.url()); });
  await page.goto("/");
  await page.getByLabel("税前月薪（元）").fill("8000");
  await page.getByRole("button", { name: /计算工资/ }).click();
  expect(requests).toEqual([]);
});

test.describe("pinned Umami tracker", () => {
  test.beforeEach(() => test.skip(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "umami"));
  test("tracks navigation, back/forward and refresh without input, query, title or referrer leaks", async ({ page, context }) => {
    const payloads = await intercept(page, await trackerSource());
    await context.addCookies([{ name: "website_cookie", value: "COOKIE_SECRET", url: "http://127.0.0.1:3000" }]);
    await page.goto("/?salary=SALARY_SECRET#FORM_SECRET", { referer: "https://www.baidu.com/s?wd=REF_SECRET" });
    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads[0].referrer).toBe("https://baidu.com");
    await page.getByLabel("税前月薪（元）").fill("98765");
    await page.getByRole("button", { name: /计算工资/ }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载 CSV 明细" }).click();
    await download;
    await page.evaluate(() => { document.title = "TITLE_SECRET"; });
    await page.getByRole("link", { name: "计算依据", exact: true }).click();
    await expect.poll(() => payloads.length).toBe(2);
    await page.goBack(); await expect.poll(() => payloads.length).toBe(3);
    await page.goForward(); await expect.poll(() => payloads.length).toBe(4);
    await page.reload(); await expect.poll(() => payloads.length).toBe(5);
    expect(payloads.map((payload) => payload.url)).toEqual(["/", "/methodology/", "/", "/methodology/", "/methodology/"]);
    expect(JSON.stringify(payloads)).not.toMatch(/SECRET|98765|\?|#/);
    for (const payload of payloads) expect(Object.keys(payload).sort()).toEqual(["hostname", "language", "referrer", "screen", "title", "url", "website"]);
  });
  test("delayed script preserves earlier route snapshots exactly once", async ({ page }) => {
    const source = await trackerSource();
    const payloads = await intercept(page, source);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/analytics/script.js", async (route) => { await gate; await route.fulfill({ contentType: "application/javascript", body: source }); });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "计算依据", exact: true }).click();
    expect(payloads).toEqual([]);
    release();
    await expect.poll(() => payloads.length).toBe(2);
    expect(payloads.map((payload) => payload.url)).toEqual(["/", "/methodology/"]);
  });
  test("script failure still allows calculation and CSV", async ({ page }) => {
    await page.route("**/analytics/script.js", (route) => route.abort());
    await page.goto("/salary-calculator/");
    await page.getByLabel("税前月薪（元）").fill("8000");
    await page.getByRole("button", { name: /计算工资/ }).click();
    await expect(page.getByLabel("全年个人缴费")).toHaveText("16,800.00");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载 CSV 明细" }).click();
    await download;
  });
});
