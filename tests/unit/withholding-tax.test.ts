import { describe, expect, it } from "vitest";
import { calculateCumulativeTax } from "@/lib/calculation/withholding-tax";

describe("cumulative salary withholding table", () => {
  it.each([
    ["0", "0.00"],
    ["36000", "1080.00"],
    ["36000.01", "1080.00"],
    ["144000", "11880.00"],
    ["144000.01", "11880.00"],
    ["300000", "43080.00"],
    ["420000", "73080.00"],
    ["660000", "145080.00"],
    ["960000", "250080.00"],
    ["960000.01", "250080.00"],
    ["1000000", "268080.00"],
  ])("applies the annual prepayment bracket to %s yuan", (taxable, expected) => {
    expect(calculateCumulativeTax(taxable)).toBe(expected);
  });
});
