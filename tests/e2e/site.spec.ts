import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("required pages and crawler files are served", async ({ page, request }) => {
  for (const path of ["/", "/salary-calculator/", "/methodology/", "/policy-sources/", "/privacy/", "/about/"]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(await response.text(), path).toContain("<html");
  }
  const homeHtml = await (await request.get("/")).text();
  const toolHtml = await (await request.get("/salary-calculator/")).text();
  for (const html of [homeHtml, toolHtml]) {
    expect(html).toContain("常见问题");
    expect(html).toContain("2026-10-11");
    expect(html).toContain("https://www.chinatax.gov.cn/");
  }
  expect((await request.get("/robots.txt")).ok()).toBe(true);
  expect((await request.get("/sitemap.xml")).ok()).toBe(true);
  await page.goto("/missing-page/");
  await expect(page.getByRole("heading", { name: /找不到/ })).toBeVisible();
});

test("360px viewport has no document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const pageWidths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(pageWidths.scroll).toBeLessThanOrEqual(pageWidths.client);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const salaryInput = page.getByRole("textbox", { name: "税前月薪（元）" });
  const inputBox = await salaryInput.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(800);
});

test("desktop homepage shows the first salary input without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const inputBox = await page.getByRole("textbox", { name: "税前月薪（元）" }).boundingBox();
  expect(inputBox).not.toBeNull();
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(900);
  const modeBox = await page.getByRole("radio", { name: /仅算个税/ }).locator("..").boundingBox();
  expect(modeBox).not.toBeNull();
  expect(modeBox!.y + modeBox!.height).toBeLessThanOrEqual(900);
});

test("tax-only calculation works after the page is loaded offline", async ({ page }) => {
  await page.goto("/salary-calculator/");
  await page.getByLabel("税前月薪（元）").fill("8000");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: /计算工资/ }).click();
  await expect(page.getByLabel("全年预扣个税")).toHaveText("1,080.00");
  await expect(page.getByText("仅算个税，未扣五险一金", { exact: true })).toBeVisible();
  await page.getByLabel("查看月份").selectOption("5");
  await expect(page.getByLabel("查看月份")).toHaveValue("5");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 CSV 明细" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("工资明细-2026.csv");
  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain('"全年合计","96000.00","0.00","1080.00","94920.00"');
  expect(csv).toContain('"地区","上海市"');
});

test("detailed salary uses new July bases and clears results after edits", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/salary-calculator/");
  await page.getByLabel("税前月薪（元）").fill("8000");
  await page.getByRole("radio", { name: /含个人缴费估算/ }).check();
  for (const [name, value] of [
    ["社保缴费基数（元）", "8000"], ["公积金缴费基数（元）", "8000"],
    ["1—6 月个人公积金比例（%）", "7"], ["7—12 月个人公积金比例（%）", "7"],
  ]) await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByRole("checkbox", { name: /7 月起缴费基数调整/ }).check();
  for (const name of ["7—12 月社保缴费基数（元）", "7—12 月公积金缴费基数（元）"])
    await page.getByLabel(name, { exact: true }).fill("10000");
  await page.getByRole("button", { name: /计算工资/ }).click();
  await expect(page.getByRole("heading", { name: "全年一览" })).toBeFocused();
  await expect(page.getByLabel("全年个人缴费")).toHaveText("18,900.00");
  await expect(page.getByLabel("全年预扣个税")).toHaveText("513.00");
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.getByLabel("查看月份").selectOption("6");
  await expect(page.getByText("本月个人缴费", { exact: true }).locator("..")).toContainText("1,400.00");
  await page.getByLabel("查看月份").selectOption("7");
  await expect(page.getByText("本月个人缴费", { exact: true }).locator("..")).toContainText("1,750.00");
  await page.getByLabel("税前月薪（元）").fill("9000");
  await expect(page.getByRole("region", { name: "计算结果" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("重新计算");
});
