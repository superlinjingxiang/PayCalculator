import { describe, expect, it } from "vitest";
import { isDirectMunicipality, MAINLAND_PROVINCES, regionName } from "@/lib/regions";

describe("mainland region selector data", () => {
  it("covers 31 mainland provincial regions and their prefecture-level choices", () => {
    expect(MAINLAND_PROVINCES).toHaveLength(31);
    expect(MAINLAND_PROVINCES.reduce((count, province) => count + province.cities.length, 0)).toBe(337);
    expect(new Set(MAINLAND_PROVINCES.map((province) => province.code)).size).toBe(31);
    expect(MAINLAND_PROVINCES.flatMap((province) => province.cities).some((city) => city.name === "杭州市")).toBe(true);
    expect(MAINLAND_PROVINCES.some((province) => province.name === "香港特别行政区")).toBe(false);
  });

  it("labels municipalities and selected cities without inventing a local policy", () => {
    expect(isDirectMunicipality("310000")).toBe(true);
    expect(isDirectMunicipality("330000")).toBe(false);
    expect(regionName("310000", "310000")).toBe("上海市");
    expect(regionName("330000", "330100")).toBe("浙江省 · 杭州市");
  });
});
