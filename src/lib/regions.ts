import regionData from "@/data/mainland-regions.json";

export type MainlandRegion = { code: string; name: string };
export type MainlandProvince = MainlandRegion & { cities: MainlandRegion[] };

export const MAINLAND_PROVINCES: MainlandProvince[] = regionData;

export function regionName(provinceCode: string, regionCode: string): string {
  const province = MAINLAND_PROVINCES.find((item) => item.code === provinceCode);
  if (!province) return "未选择地区";
  const city = province.cities.find((item) => item.code === regionCode);
  return city ? `${province.name} · ${city.name}` : province.name;
}

export function isDirectMunicipality(code: string): boolean {
  return ["110000", "120000", "310000", "500000"].includes(code);
}
