import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { SalaryInput, SalaryResult } from "@/lib/calculation/types";
import SalaryResults from "@/components/SalaryResults";

const makeResult = (overrides: Partial<SalaryResult> = {}): SalaryResult => ({
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    gross: "1000.00",
    contributionsByType: { pension: "10.00", medical: "5.00", unemployment: "1.00", housing: "4.00" },
    contributionsTotal: "20.00",
    contributionDetails: {
      contributions: { pension: "10.00", medical: "5.00", unemployment: "1.00", housing: "4.00" },
      socialInsuranceBase: { entered: "200.00", effective: "200.00", adjustedBy: null },
      housingFundBase: { entered: "100.00", effective: "100.00", adjustedBy: null },
      rates: { pension: "5", medical: "2.5", unemployment: "0.5", housing: "4" },
    },
    basicDeduction: "5000.00",
    additionalDeduction: "0.00",
    otherDeduction: "0.00",
    exemptIncome: "0.00",
    cumulativeTaxable: "0.00",
    cumulativeWithholding: "6.00",
    currentTax: "6.00",
    takeHome: "974.00",
    policyVersion: "test-policy",
    policyVerifiedAt: "2026-01-01",
    policySources: [{ label: "测试来源", url: "https://example.com/policy" }],
  })),
  grossTotal: "12000.00",
  personalContributionsTotal: "240.00",
  additionalDeductionsTotal: "0.00",
  taxWithheldTotal: "72.00",
  takeHomeTotal: "11688.00",
  warnings: [],
  assumptions: [],
  ...overrides,
});

const taxOnly: SalaryInput["mode"] = "taxOnly";
const detailed: SalaryInput["mode"] = "detailed";

afterEach(cleanup);

describe("SalaryResults annual breakdown chart", () => {
  it("shows each detailed contribution category alongside tax and take-home", () => {
    render(<SalaryResults result={makeResult()} mode={detailed} regionName="上海市" />);

    const chart = screen.getByRole("figure", { name: "全年收入构成" });
    expect(within(chart).getByText("养老")).toBeInTheDocument();
    expect(within(chart).getByText("医疗")).toBeInTheDocument();
    expect(within(chart).getByText("失业")).toBeInTheDocument();
    expect(within(chart).getByText("公积金")).toBeInTheDocument();
    expect(within(chart).getByText("预扣个税")).toBeInTheDocument();
    expect(within(chart).getByText("估算实发")).toBeInTheDocument();
    expect(within(chart).getByText("120.00 元")).toBeInTheDocument();
    expect(within(chart).getByText("11,688.00 元")).toBeInTheDocument();
  });

  it("shows zero contribution values in tax-only mode", () => {
    const result = makeResult({
      personalContributionsTotal: "0.00",
      taxWithheldTotal: "72.00",
      takeHomeTotal: "11928.00",
      months: makeResult().months.map((month) => ({
        ...month,
        contributionsByType: { pension: "0.00", medical: "0.00", unemployment: "0.00", housing: "0.00" },
        contributionsTotal: "0.00",
        takeHome: "994.00",
      })),
    });
    render(<SalaryResults result={result} mode={taxOnly} regionName="上海市" />);

    const chart = screen.getByRole("figure", { name: "全年收入构成" });
    expect(within(chart).getAllByText("0.00 元")).toHaveLength(4);
    expect(within(chart).getByText("扣税后余额")).toBeInTheDocument();
    expect(screen.getByText("仅算个税，未扣五险一金")).toBeInTheDocument();
  });

  it("does not render NaN percentages for a zero gross total", () => {
    const result = makeResult({
      grossTotal: "0.00",
      personalContributionsTotal: "0.00",
      taxWithheldTotal: "0.00",
      takeHomeTotal: "0.00",
      months: makeResult().months.map((month) => ({
        ...month,
        gross: "0.00",
        contributionsByType: { pension: "0.00", medical: "0.00", unemployment: "0.00", housing: "0.00" },
        contributionsTotal: "0.00",
        currentTax: "0.00",
        cumulativeWithholding: "0.00",
        takeHome: "0.00",
      })),
    });
    render(<SalaryResults result={result} mode={detailed} regionName="上海市" />);

    const chart = screen.getByRole("figure", { name: "全年收入构成" });
    expect(within(chart).queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
