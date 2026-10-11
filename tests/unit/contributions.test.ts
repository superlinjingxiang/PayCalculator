import { describe, expect, it } from "vitest";
import { computeMonthlyContributions } from "@/lib/calculation/contributions";
import { getPolicyForMonth } from "@/lib/policy/loader";

describe("personal contributions", () => {
  it("clamps Shanghai June social and housing bases to their separate minima", () => {
    const result = computeMonthlyContributions(getPolicyForMonth("shanghai", 2026, 6), {
      socialInsuranceBase: "1000",
      housingFundBase: "1000",
      rates: { pension: "8", medical: "2", unemployment: "0.5", housing: "7" },
    });
    expect(result).toEqual({
      pension: "596.80",
      medical: "149.20",
      unemployment: "37.30",
      housing: "188.00",
    });
  });

  it("uses new July minima and whole-yuan personal housing rounding", () => {
    const result = computeMonthlyContributions(getPolicyForMonth("shanghai", 2026, 7), {
      socialInsuranceBase: "1000",
      housingFundBase: "1000",
      rates: { pension: "8", medical: "2", unemployment: "0.5", housing: "7" },
    });
    expect(result).toEqual({
      pension: "603.68",
      medical: "150.92",
      unemployment: "37.73",
      housing: "192.00",
    });
  });

  it("clamps at the Shanghai upper limits and rounds each contribution separately", () => {
    const result = computeMonthlyContributions(getPolicyForMonth("shanghai", 2026, 7), {
      socialInsuranceBase: "99999",
      housingFundBase: "99999",
      rates: { pension: "8", medical: "2", unemployment: "0.5", housing: "5" },
    });
    expect(result).toEqual({
      pension: "3018.48",
      medical: "754.62",
      unemployment: "188.66",
      housing: "1887.00",
    });
  });

  it("does not apply Shanghai limits or housing rounding to custom estimates", () => {
    const result = computeMonthlyContributions(getPolicyForMonth("custom", 2026, 7), {
      socialInsuranceBase: "1000",
      housingFundBase: "1000.10",
      rates: { pension: "8", medical: "2", unemployment: "0.5", housing: "5" },
    });
    expect(result).toEqual({
      pension: "80.00",
      medical: "20.00",
      unemployment: "5.00",
      housing: "50.01",
    });
  });
});
