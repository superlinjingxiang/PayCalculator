import custom from "@/config/policies/custom-template.json";
import shanghaiH1 from "@/config/policies/shanghai-2025-07.json";
import shanghaiH2 from "@/config/policies/shanghai-2026-07.json";
import { parseMonthPolicy, type CityCode, type MonthPolicy } from "./schemas";

const rules = [custom, shanghaiH1, shanghaiH2].map(parseMonthPolicy);

export function validatePolicyCollection(policies: MonthPolicy[]): void {
  const ids = new Set<string>();
  for (const rule of policies) {
    if (ids.has(rule.id)) throw new Error(`政策 ID 重复：${rule.id}`);
    ids.add(rule.id);
    const nextDay = new Date(`${rule.effectiveTo}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    if (!rule.effectiveFrom.endsWith("-01") || nextDay.getUTCDate() !== 1) {
      throw new Error(`政策 ${rule.id} 须覆盖完整月份，不支持月中变更`);
    }
  }
  for (let index = 0; index < policies.length; index++) {
    for (const other of policies.slice(index + 1)) {
      const rule = policies[index];
      if (rule.city === other.city && rule.effectiveFrom <= other.effectiveTo && other.effectiveFrom <= rule.effectiveTo) {
        throw new Error(`政策日期重叠：${rule.id} 与 ${other.id}`);
      }
    }
  }
  for (const city of ["shanghai", "custom"] as const) {
    for (let month = 1; month <= 12; month++) {
      const date = `2026-${String(month).padStart(2, "0")}-01`;
      if (!policies.some((rule) => rule.city === city && rule.effectiveFrom <= date && date <= rule.effectiveTo)) {
        throw new Error(`缺少 ${city} 2026 年 ${month} 月政策`);
      }
    }
  }
}

validatePolicyCollection(rules);

export function getPolicyForMonth(cityCode: CityCode, year: number, month: number): MonthPolicy {
  if (year !== 2026 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("仅支持2026年1月至12月政策");
  }
  if (cityCode !== "shanghai" && cityCode !== "custom") {
    throw new Error("不支持的地区");
  }
  const date = `${year}-${String(month).padStart(2, "0")}-01`;
  const rule = rules.find(
    (item) => item.city === cityCode && item.effectiveFrom <= date && date <= item.effectiveTo,
  );
  if (!rule) throw new Error(`${year}年${month}月缺少${cityCode}政策参数`);
  return rule;
}
