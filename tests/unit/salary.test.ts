import { describe, expect, it } from "vitest";
import { calculateSalary, SalaryValidationError } from "@/lib/calculation/salary";
import type { SalaryInput } from "@/lib/calculation/types";

const taxOnly = (changes: Partial<SalaryInput> = {}): SalaryInput => ({
  taxYear: 2026,
  cityCode: "shanghai",
  mode: "taxOnly",
  startMonth: 1,
  monthlyGross: "8000",
  ...changes,
});

const shanghaiDetailed = (changes: Partial<SalaryInput> = {}): SalaryInput => ({
  ...taxOnly(),
  mode: "detailed",
  socialInsuranceBase: "1000",
  housingFundBase: "1000",
  contributionRates: { housingH1: "7", housingH2: "7" },
  ...changes,
});

describe("2026 salary estimation", () => {
  it("uses confirmed new bases from July without changing January through June", () => {
    const result = calculateSalary(shanghaiDetailed({
      socialInsuranceBase: "8000", housingFundBase: "8000",
      socialInsuranceBaseH2: "10000", housingFundBaseH2: "10000",
    }));
    expect(result.months[5].contributionsTotal).toBe("1400.00");
    expect(result.months[6].contributionsTotal).toBe("1750.00");
    expect(result.personalContributionsTotal).toBe("18900.00");
    expect(result.taxWithheldTotal).toBe("513.00");
    expect(result.takeHomeTotal).toBe("76587.00");
  });

  it("changes each custom base independently from July", () => {
    const result = calculateSalary(shanghaiDetailed({
      cityCode: "custom", socialInsuranceBase: "1000", housingFundBase: "3000",
      housingFundBaseH2: "4000",
      contributionRates: { pension: "8", medical: "2", unemployment: "0.5", housingH1: "5", housingH2: "7" },
    }));
    expect(result.months[5].contributionsTotal).toBe("255.00");
    expect(result.months[6].contributionsByType).toEqual({ pension: "80.00", medical: "20.00", unemployment: "5.00", housing: "280.00" });
  });
  it.each(["0", "5000"])("withholds no tax for a constant %s-yuan monthly wage", (monthlyGross) => {
    const result = calculateSalary(taxOnly({ monthlyGross }));
    expect(result.taxWithheldTotal).toBe("0.00");
    expect(result.months.every((row) => row.currentTax === "0.00")).toBe(true);
  });

  it("withholds 1,080 yuan on twelve 8,000-yuan wages with no deductions", () => {
    const result = calculateSalary(taxOnly());
    expect(result.months).toHaveLength(12);
    expect(result.months[0]).toMatchObject({
      gross: "8000.00",
      basicDeduction: "5000.00",
      cumulativeTaxable: "3000.00",
      currentTax: "90.00",
      takeHome: "7910.00",
      policyVersion: "cn-2026-national",
    });
    expect(result.months[11].cumulativeTaxable).toBe("36000.00");
    expect(result.taxWithheldTotal).toBe("1080.00");
    expect(result.takeHomeTotal).toBe("94920.00");
    expect(result.warnings.join(" ")).toContain("未扣除五险一金");
  });

  it("deducts 5,000 yuan only for each employment month starting in May", () => {
    const result = calculateSalary(taxOnly({ startMonth: 5 }));
    expect(result.months.slice(0, 4).map((row) => row.gross)).toEqual(Array(4).fill("0.00"));
    expect(result.months[3].basicDeduction).toBe("0.00");
    expect(result.months[4].basicDeduction).toBe("5000.00");
    expect(result.months[4].currentTax).toBe("90.00");
    expect(result.months[11].cumulativeTaxable).toBe("24000.00");
    expect(result.taxWithheldTotal).toBe("720.00");
  });

  it("uses cumulative brackets so 30,000-yuan months have changing withholding", () => {
    const result = calculateSalary(taxOnly({ monthlyGross: "30000" }));
    expect(result.months[0].currentTax).toBe("750.00");
    expect(result.months[1].currentTax).toBe("1730.00");
    expect(result.months[11].cumulativeTaxable).toBe("300000.00");
    expect(result.taxWithheldTotal).toBe("43080.00");
  });

  it("does not create a negative refund when later zero wages lower cumulative tax", () => {
    const result = calculateSalary(taxOnly({
      monthlyGross: "0",
      monthlyGrossOverrides: ["100000", ...Array(11).fill("0")],
    }));
    expect(result.months[0].currentTax).toBe("6980.00");
    expect(result.months[1].currentTax).toBe("0.00");
    expect(result.months[11].cumulativeWithholding).toBe("6980.00");
    expect(result.warnings.join(" ")).toContain("不自动退税");
  });

  it("uses every gross override and maintains the exact annual payout identity", () => {
    const result = calculateSalary(taxOnly({
      monthlyGross: "0",
      monthlyGrossOverrides: ["5000.01", "7000.02", "9000.03", ...Array(9).fill("8000.04")],
      additionalDeductionsMonthly: "1000.05",
      otherDeductionsMonthly: "100.06",
      exemptIncomeMonthly: "200.07",
    }));
    expect(result.months[0].gross).toBe("5000.01");
    expect(result.months[1].gross).toBe("7000.02");
    expect(result.months[2].gross).toBe("9000.03");
    expect(result.grossTotal).toBe("93000.42");
    expect(result.takeHomeTotal).toBe("92478.47");
    expect(result.taxWithheldTotal).toBe("521.95");
    expect(result.months[11].cumulativeWithholding).toBe(result.taxWithheldTotal);
  });

  it("switches Shanghai contribution limits and policy versions in July", () => {
    const result = calculateSalary(shanghaiDetailed());
    expect(result.months[5].contributionsByType).toEqual({
      pension: "596.80", medical: "149.20", unemployment: "37.30", housing: "188.00",
    });
    expect(result.months[6].contributionsByType).toEqual({
      pension: "603.68", medical: "150.92", unemployment: "37.73", housing: "192.00",
    });
    expect(result.months[5].policyVersion).toBe("shanghai-2025-07");
    expect(result.months[6].policyVersion).toBe("shanghai-2026-07");
    expect(result.personalContributionsTotal).toBe("11733.78");
    expect(result.taxWithheldTotal).toBe("727.99");
    expect(result.takeHomeTotal).toBe("83538.23");
    expect(result.warnings.join(" ")).toContain("失业保险");
  });

  it("keeps custom rates and bases manual without Shanghai clamps", () => {
    const result = calculateSalary({
      ...taxOnly({ cityCode: "custom", monthlyGross: "10000" }),
      mode: "detailed",
      socialInsuranceBase: "1000",
      housingFundBase: "1000",
      contributionRates: {
        pension: "8", medical: "2", unemployment: "0.5", housingH1: "12", housingH2: "5",
      },
    });
    expect(result.months[0].contributionsByType).toEqual({
      pension: "80.00", medical: "20.00", unemployment: "5.00", housing: "120.00",
    });
    expect(result.months[6].contributionsByType.housing).toBe("50.00");
    expect(result.warnings.join(" ")).toContain("用户手填");
  });
});

describe("salary input validation", () => {
  it.each(["", "0", "-1", "1.001", "1000000000"])("rejects an invalid new July base %s", (value) => {
    expect(() => calculateSalary(shanghaiDetailed({ socialInsuranceBaseH2: value }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(shanghaiDetailed({ housingFundBaseH2: value }))).toThrowError(SalaryValidationError);
  });
  it.each([
    ["", "monthlyGross"],
    ["-1", "monthlyGross"],
    ["1.234", "monthlyGross"],
    ["1e3", "monthlyGross"],
    ["1000000000", "monthlyGross"],
  ])("rejects malformed or oversized monthly wages %s", (gross, field) => {
    expect(() => calculateSalary(taxOnly({ monthlyGross: gross }))).toThrowError(SalaryValidationError);
    try { calculateSalary(taxOnly({ monthlyGross: gross })); }
    catch (error) { expect((error as SalaryValidationError).field).toBe(field); }
  });

  it.each([0, 13, 1.5])("rejects start month %s", (startMonth) => {
    expect(() => calculateSalary(taxOnly({ startMonth }))).toThrowError(SalaryValidationError);
  });

  it("rejects the wrong tax year", () => {
    expect(() => calculateSalary(taxOnly({ taxYear: 2025 as 2026 }))).toThrowError(SalaryValidationError);
  });

  it("rejects gross overrides with the wrong number of months or a bad entry", () => {
    expect(() => calculateSalary(taxOnly({ monthlyGrossOverrides: ["8000"] }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(taxOnly({
      monthlyGrossOverrides: [...Array(11).fill("8000"), "bad"],
    }))).toThrowError(SalaryValidationError);
  });

  it("does not invent missing Shanghai bases or housing rates", () => {
    expect(() => calculateSalary(shanghaiDetailed({ socialInsuranceBase: undefined }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(shanghaiDetailed({ housingFundBase: undefined }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(shanghaiDetailed({ contributionRates: { housingH1: "7" } }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(shanghaiDetailed({ contributionRates: { housingH1: "12", housingH2: "7" } }))).toThrowError(SalaryValidationError);
  });

  it("requires every custom detailed rate rather than silently using zero", () => {
    expect(() => calculateSalary({
      ...shanghaiDetailed({ cityCode: "custom" }),
      contributionRates: { pension: "8", medical: "2", housingH1: "5", housingH2: "5" },
    })).toThrowError(SalaryValidationError);
  });

  it("rejects malformed optional deductions", () => {
    expect(() => calculateSalary(taxOnly({ additionalDeductionsMonthly: "" }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(taxOnly({ otherDeductionsMonthly: "-1" }))).toThrowError(SalaryValidationError);
    expect(() => calculateSalary(taxOnly({ exemptIncomeMonthly: "1.001" }))).toThrowError(SalaryValidationError);
  });
});
