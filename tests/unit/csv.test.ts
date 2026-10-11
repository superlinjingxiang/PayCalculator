import { describe, expect, it } from "vitest";
import { calculateSalary } from "@/lib/calculation/salary";
import { salaryCsv } from "@/lib/export/salary-csv";

const result = calculateSalary({ taxYear: 2026, cityCode: "shanghai", mode: "taxOnly", startMonth: 5, monthlyGross: "8000" });

describe("salary CSV export", () => {
  it("retains other deductions and exempt income so the exported tax basis can be reconciled", () => {
    const adjusted = calculateSalary({ taxYear: 2026, cityCode: "custom", mode: "taxOnly", startMonth: 5, monthlyGross: "8000", otherDeductionsMonthly: "100", exemptIncomeMonthly: "200" });
    expect(adjusted.months[3]).toMatchObject({ otherDeduction: "0.00", exemptIncome: "0.00" });
    expect(adjusted.months[4]).toMatchObject({ otherDeduction: "100.00", exemptIncome: "200.00", cumulativeTaxable: "2700.00" });
    const csv = salaryCsv(adjusted, { regionName: "北京市", mode: "taxOnly" });
    expect(csv).toContain('"其他依法扣除","免税收入","累计应税所得"');
    expect(csv).toContain('"5000.00","0.00","100.00","200.00","2700.00"');
  });
  it("exports all months, exact annual totals and the tax-only assumptions", () => {
    const csv = salaryCsv(result, { regionName: "上海市", mode: "taxOnly" });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"地区","上海市"\r\n');
    expect(csv).toContain('"计算范围","仅算个税，未扣五险一金"');
    expect(csv).toContain('"1","0.00","0.00"');
    expect(csv).toContain('"5","8000.00","0.00"');
    expect(csv).toContain('"12","8000.00","0.00"');
    expect(csv).toContain('"全年合计","64000.00","0.00","720.00","63280.00"');
    expect(csv).toContain('"规则版本"');
    expect(csv).toContain('"提醒","仅算个税，未扣除五险一金；结果余额不是实际到手工资。"');
  });

  it("quotes newlines and commas and neutralizes spreadsheet formulas in text", () => {
    const csv = salaryCsv({ ...result, warnings: ['=HYPERLINK("bad")', "一,二\n三"] }, { regionName: "+危险", mode: "detailed" });
    expect(csv).toContain('"地区","\'+危险"');
    expect(csv).toContain('"提醒","\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"提醒","一,二\n三"');
    expect(csv).toContain('"计算范围","含个人缴费估算"');
  });
});
