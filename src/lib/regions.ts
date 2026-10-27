import regionData from "@/data/mainland-regions.json";

export type MainlandRegion = { code: string; name: string };
export type MainlandProvince = MainlandRegion & { cities: MainlandRegion[] };

export const MAINLAND_PROVINCES: MainlandProvince[] = regionData;

export function regionName(provinceCode: string, regionCode: string, districtName = ""): string {
  const province = MAINLAND_PROVINCES.find((item) => item.code === provinceCode);
  if (!province) return "未选择地区";
  const city = isDirectMunicipality(provinceCode)
    ? { code: province.code, name: province.name }
    : province.cities.find((item) => item.code === regionCode);
  if (!city) return province.name;
  if (!districtName) return isDirectMunicipality(provinceCode) ? province.name : `${province.name} · ${city.name}`;
  return isDirectMunicipality(provinceCode)
    ? `${province.name} · ${districtName}`
    : `${province.name} · ${city.name} · ${districtName}`;
}

export function isDirectMunicipality(code: string): boolean {
  return ["110000", "120000", "310000", "500000"].includes(code);
}
