import { describe, expect, it } from "vitest";
import { getPolicyForMonth, validatePolicyCollection } from "@/lib/policy/loader";
import national from "@/config/policies/cn-2026-national.json";
import { parseMonthPolicy, parseNationalPolicy } from "@/lib/policy/schemas";

describe("monthly policy selection", () => {
  it("rejects ambiguous, incomplete and mid-month policy collections", () => {
    const h1 = getPolicyForMonth("shanghai", 2026, 6);
    const h2 = getPolicyForMonth("shanghai", 2026, 7);
    const manual = getPolicyForMonth("custom", 2026, 1);
    const policies = [h1, h2, manual];
    expect(() => validatePolicyCollection(policies)).not.toThrow();
    expect(() => validatePolicyCollection([...policies, { ...h2, id: "duplicate" }])).toThrow(/重叠/);
    expect(() => validatePolicyCollection([h1, manual])).toThrow(/缺少/);
    expect(() => validatePolicyCollection([h1, { ...h2, effectiveFrom: "2026-07-15" }, manual])).toThrow(/完整月份/);
  });

  it("rejects unsafe source URLs and local rates over 100 percent", () => {
    const valid = getPolicyForMonth("shanghai", 2026, 7);
    expect(() => parseMonthPolicy({ ...valid, sourceUrls: { ...valid.sourceUrls, socialBase: "https://" } })).toThrow();
    expect(() => parseMonthPolicy({ ...valid, personalRates: { ...valid.personalRates, pension: "101" } })).toThrow();
    expect(() => parseMonthPolicy({ ...valid, housingRateOptions: ["101"] })).toThrow();
  });

  it("rejects a national table with discontinuous tax or decreasing rates", () => {
    const wrongDeduction = structuredClone(national);
    wrongDeduction.brackets[1].quickDeduction = "2500";
    expect(() => parseNationalPolicy(wrongDeduction)).toThrow(/连续/);
    const wrongRate = structuredClone(national);
    wrongRate.brackets[1].rate = "0.02";
    expect(() => parseNationalPolicy(wrongRate)).toThrow();
  });
  it("uses the 2025 Shanghai limits through June and the 2026 limits from July", () => {
    const june = getPolicyForMonth("shanghai", 2026, 6);
    const july = getPolicyForMonth("shanghai", 2026, 7);

    expect(june.id).toBe("shanghai-2025-07");
    expect(june.socialBase).toEqual({ minimum: "7460", maximum: "37302" });
    expect(june.housingBase).toEqual({ minimum: "2690", maximum: "37302" });
    expect(july.id).toBe("shanghai-2026-07");
    expect(july.socialBase).toEqual({ minimum: "7546", maximum: "37731" });
    expect(july.housingBase).toEqual({ minimum: "2740", maximum: "37731" });
  });

  it("does not give custom locations invented local limits or rates", () => {
    const rule = getPolicyForMonth("custom", 2026, 7);
    expect(rule.socialBase).toBeNull();
    expect(rule.housingBase).toBeNull();
    expect(rule.personalRates).toBeNull();
  });

  it.each([[2025, 1], [2026, 0], [2026, 13]])(
    "rejects a policy request outside the supported period: %i/%i",
    (year, month) => {
      expect(() => getPolicyForMonth("shanghai", year, month)).toThrow();
    },
  );

  it("rejects a national bracket missing its quick deduction", () => {
    expect(parseNationalPolicy(national).brackets).toHaveLength(7);
    const corrupted = structuredClone(national) as unknown as Record<string, unknown>;
    const brackets = corrupted.brackets as Record<string, unknown>[];
    delete brackets[1].quickDeduction;
    expect(() => parseNationalPolicy(corrupted)).toThrow(/quickDeduction/);
  });

  it("rejects a local policy with missing policy sources", () => {
    const valid = getPolicyForMonth("shanghai", 2026, 7);
    expect(() => parseMonthPolicy({
      ...valid,
      sourceUrls: {},
    })).toThrow();
  });

  it("rejects calendar dates that JavaScript would silently normalize", () => {
    const valid = getPolicyForMonth("shanghai", 2026, 7);
    expect(() => parseMonthPolicy({
      ...valid,
      effectiveFrom: "2026-02-31",
    })).toThrow(/effectiveFrom/);
  });
});
