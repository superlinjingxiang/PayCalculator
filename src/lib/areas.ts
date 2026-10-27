import compactAreaData from "@province-city-china/area/area.min.json";
import { isDirectMunicipality, type MainlandRegion } from "@/lib/regions";

type CompactArea = { c: string; n: string; p: string; y: string };
const MAINLAND_AREAS = (compactAreaData as CompactArea[]).map(({ c: code, n: name, p: province, y: city }) => ({ code, name, province, city }));

export function areaOptions(provinceCode: string, regionCode: string): MainlandRegion[] {
  if (!provinceCode || !regionCode) return [];
  const province = provinceCode.slice(0, 2);
  const city = isDirectMunicipality(provinceCode) ? "01" : regionCode.slice(2, 4);
  return MAINLAND_AREAS
    .filter((area) => area.province === province && area.city === city)
    .map(({ code, name }) => ({ code, name }));
}
