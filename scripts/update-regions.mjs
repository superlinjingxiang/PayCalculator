import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => JSON.parse(readFileSync(`${root}node_modules/@province-city-china/${name}/${name}.json`, "utf8"));
const provinces = read("province").filter(({ code }) => Number(code.slice(0, 2)) < 70);
const cities = read("city");
const regions = provinces.map(({ code, name }) => ({
  code,
  name,
  cities: cities.filter((city) => city.province === code.slice(0, 2)).map(({ code: cityCode, name: cityName }) => ({
    code: cityCode,
    name: cityName.includes("直辖县级行政区划") ? "省直辖县级地区" : cityName,
  })),
}));

if (regions.length !== 31 || regions.reduce((sum, item) => sum + item.cities.length, 0) < 330) {
  throw new Error("省市数据数量异常，请核对来源版本");
}
writeFileSync(`${root}src/data/mainland-regions.json`, `${JSON.stringify(regions, null, 2)}\n`, "utf8");
console.log(`Wrote ${regions.length} provinces and ${regions.reduce((sum, item) => sum + item.cities.length, 0)} city entries.`);
