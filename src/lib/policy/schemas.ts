import Decimal from "decimal.js";

export type CityCode = "shanghai" | "custom";
export type Bounds = { minimum: string; maximum: string };
export type PersonalRates = {
  pension: string;
  medical: string;
  unemployment: string;
};

export interface MonthPolicy {
  id: string;
  city: CityCode;
  effectiveFrom: string;
  effectiveTo: string;
  verifiedAt: string;
  status: "verified-with-assumption" | "manual-unverified";
  sourceUrls: Record<string, string>;
  socialBase: Bounds | null;
  housingBase: Bounds | null;
  personalRates: PersonalRates | null;
  unemploymentRateStatus: "inferred-continuity" | "manual";
  housingRateOptions: string[] | null;
  housingRounding: "whole-yuan-half-up" | "cent-half-up";
  notes: string;
}

export interface NationalTaxPolicy {
  id: string;
  city: "cn";
  effectiveFrom: string;
  effectiveTo: string;
  verifiedAt: string;
  status: "verified";
  sourceUrl: string;
  formulaSourceUrl: string;
  basicDeductionMonthly: string;
  brackets: { upper: string | null; rate: string; quickDeduction: string }[];
  notes: string;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("政策数据格式不正确");
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`政策数据缺少 ${name}`);
  }
  return value;
}

function amount(value: unknown, name: string): string {
  const parsed = string(value, name);
  if (!/^\d+(?:\.\d{1,2})?$/.test(parsed) || !new Decimal(parsed).isFinite()) {
    throw new Error(`政策数据 ${name} 不是金额`);
  }
  return parsed;
}

function bounds(value: unknown, name: string): Bounds | null {
  if (value === null) return null;
  const data = record(value);
  const minimum = amount(data.minimum, `${name}.minimum`);
  const maximum = amount(data.maximum, `${name}.maximum`);
  if (new Decimal(minimum).gt(maximum)) throw new Error(`${name} 上限低于下限`);
  return { minimum, maximum };
}

function date(value: unknown, name: string): string {
  const parsed = string(value, name);
  const instant = Date.parse(`${parsed}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) ||
      Number.isNaN(instant) || new Date(instant).toISOString().slice(0, 10) !== parsed) {
    throw new Error(`政策数据 ${name} 不是日期`);
  }
  return parsed;
}

function httpsUrl(value: unknown, name: string): string {
  const url = string(value, name);
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error(`政策来源 ${name} 不是有效链接`); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(`政策来源 ${name} 必须是无账号凭据的 HTTPS 链接`);
  return url;
}

function percentage(value: unknown, name: string): string {
  const rate = amount(value, name);
  if (new Decimal(rate).gt(100)) throw new Error(`政策数据 ${name} 超过100%`);
  return rate;
}

export function parseNationalPolicy(value: unknown): NationalTaxPolicy {
  const data = record(value);
  if (data.city !== "cn" || data.status !== "verified") {
    throw new Error("国家个税政策标识或核实状态不正确");
  }
  const effectiveFrom = date(data.effectiveFrom, "effectiveFrom");
  const effectiveTo = date(data.effectiveTo, "effectiveTo");
  if (effectiveFrom > effectiveTo) throw new Error("政策生效日期顺序不正确");
  if (!Array.isArray(data.brackets) || data.brackets.length !== 7) {
    throw new Error("国家个税政策须包含完整的七级预扣率表");
  }
  let previousUpper = new Decimal(0);
  const brackets = data.brackets.map((raw, index) => {
    const item = record(raw);
    const upper = item.upper === null ? null : amount(item.upper, `brackets.${index}.upper`);
    if ((index === 6) !== (upper === null)) {
      throw new Error(`brackets.${index}.upper 须仅最后一级为空`);
    }
    if (upper !== null) {
      if (new Decimal(upper).lte(previousUpper)) throw new Error("国家个税税率表上界必须逐级递增");
      previousUpper = new Decimal(upper);
    }
    const rate = amount(item.rate, `brackets.${index}.rate`);
    if (new Decimal(rate).gt(1)) throw new Error(`brackets.${index}.rate 超出范围`);
    return {
      upper,
      rate,
      quickDeduction: amount(item.quickDeduction, `brackets.${index}.quickDeduction`),
    };
  });
  if (!new Decimal(brackets[0].quickDeduction).isZero()) throw new Error("首档速算扣除数须为0");
  for (let index = 1; index < brackets.length; index++) {
    const previous = brackets[index - 1];
    const current = brackets[index];
    if (new Decimal(current.rate).lte(previous.rate)) throw new Error("国家个税税率须逐档递增");
    const expected = new Decimal(previous.upper!).mul(new Decimal(current.rate).minus(previous.rate)).plus(previous.quickDeduction);
    if (!expected.eq(current.quickDeduction)) throw new Error("国家个税速算扣除数须保证各档边界税额连续");
  }
  return {
    id: string(data.id, "id"),
    city: "cn",
    effectiveFrom,
    effectiveTo,
    verifiedAt: date(data.verifiedAt, "verifiedAt"),
    status: "verified",
    sourceUrl: httpsUrl(data.sourceUrl, "sourceUrl"),
    formulaSourceUrl: httpsUrl(data.formulaSourceUrl, "formulaSourceUrl"),
    basicDeductionMonthly: amount(data.basicDeductionMonthly, "basicDeductionMonthly"),
    brackets,
    notes: string(data.notes, "notes"),
  };
}

export function parseMonthPolicy(value: unknown): MonthPolicy {
  const data = record(value);
  const city = string(data.city, "city");
  if (city !== "shanghai" && city !== "custom") throw new Error("不支持的政策城市");
  const status = string(data.status, "status");
  if (status !== "verified-with-assumption" && status !== "manual-unverified") {
    throw new Error("不支持的政策核实状态");
  }
  const effectiveFrom = date(data.effectiveFrom, "effectiveFrom");
  const effectiveTo = date(data.effectiveTo, "effectiveTo");
  if (effectiveFrom > effectiveTo) throw new Error("政策生效日期顺序不正确");
  const sourceData = record(data.sourceUrls);
  const sourceUrls: Record<string, string> = {};
  for (const [key, source] of Object.entries(sourceData)) {
    sourceUrls[key] = httpsUrl(source, `sourceUrls.${key}`);
  }
  let personalRates: PersonalRates | null = null;
  if (data.personalRates !== null) {
    const rates = record(data.personalRates);
    personalRates = {
      pension: percentage(rates.pension, "personalRates.pension"),
      medical: percentage(rates.medical, "personalRates.medical"),
      unemployment: percentage(rates.unemployment, "personalRates.unemployment"),
    };
  }
  let housingRateOptions: string[] | null = null;
  if (data.housingRateOptions !== null) {
    if (!Array.isArray(data.housingRateOptions) || data.housingRateOptions.length === 0) {
      throw new Error("政策数据缺少住房公积金费率选项");
    }
    housingRateOptions = data.housingRateOptions.map((rate, index) =>
      percentage(rate, `housingRateOptions.${index}`),
    );
  }
  const unemploymentRateStatus = string(data.unemploymentRateStatus, "unemploymentRateStatus");
  if (unemploymentRateStatus !== "inferred-continuity" && unemploymentRateStatus !== "manual") {
    throw new Error("政策失业费率状态不正确");
  }
  const housingRounding = string(data.housingRounding, "housingRounding");
  if (housingRounding !== "whole-yuan-half-up" && housingRounding !== "cent-half-up") {
    throw new Error("政策公积金舍入规则不正确");
  }
  const socialBase = bounds(data.socialBase, "socialBase");
  const housingBase = bounds(data.housingBase, "housingBase");
  if (city === "shanghai") {
    if (!socialBase || !housingBase || !personalRates || !housingRateOptions ||
        !sourceUrls.socialBase || !sourceUrls.housingBase || !sourceUrls.personalRates) {
      throw new Error("上海政策缺少缴费基数、费率或官方来源");
    }
  } else if (socialBase || housingBase || personalRates || housingRateOptions) {
    throw new Error("自定义政策不得预设地方缴费参数");
  }
  return {
    id: string(data.id, "id"),
    city,
    effectiveFrom,
    effectiveTo,
    verifiedAt: date(data.verifiedAt, "verifiedAt"),
    status,
    sourceUrls,
    socialBase,
    housingBase,
    personalRates,
    unemploymentRateStatus,
    housingRateOptions,
    housingRounding,
    notes: string(data.notes, "notes"),
  };
}
