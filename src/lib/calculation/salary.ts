import Decimal from "decimal.js";
import { getPolicyForMonth } from "@/lib/policy/loader";
import type { CityCode, MonthPolicy, PersonalRates } from "@/lib/policy/schemas";
import { computeMonthlyContributions, type ContributionBreakdown } from "./contributions";
import { BASIC_DEDUCTION_MONTHLY, NATIONAL_POLICY_ID } from "./brackets";
import { moneyString, ZERO } from "./money";
import type { ContributionRatesInput, MonthlyResult, SalaryInput, SalaryResult } from "./types";
import { calculateCumulativeTax } from "./withholding-tax";

const MAX_AMOUNT = new Decimal("999999999.99");
const EMPTY_CONTRIBUTIONS: ContributionBreakdown = {
  pension: "0.00", medical: "0.00", unemployment: "0.00", housing: "0.00",
};

export class SalaryValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "SalaryValidationError";
    this.field = field;
  }
}

function amount(value: unknown, field: string, label: string, positive = false): Decimal {
  if (typeof value !== "string" || value === "") {
    throw new SalaryValidationError(field, `请输入${label}`);
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new SalaryValidationError(field, `${label}须为非负金额，最多保留两位小数`);
  }
  const parsed = new Decimal(value);
  if (parsed.gt(MAX_AMOUNT) || (positive && parsed.isZero())) {
    throw new SalaryValidationError(field, `${label}超出有效范围`);
  }
  return parsed;
}

function optionalAmount(value: unknown, field: string, label: string): Decimal {
  return value === undefined ? ZERO : amount(value, field, label);
}

function percent(value: unknown, field: string, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new SalaryValidationError(field, `请输入${label}`);
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || new Decimal(value).gt(100)) {
    throw new SalaryValidationError(field, `${label}须为0至100之间的百分比，最多保留两位小数`);
  }
  return value;
}

function validateInput(input: SalaryInput): {
  grossByMonth: Decimal[];
  socialBase: string | undefined;
  housingBase: string | undefined;
  socialBaseH2?: string;
  housingBaseH2?: string;
  rates: ContributionRatesInput;
  additional: Decimal;
  other: Decimal;
  exempt: Decimal;
} {
  if (input.taxYear !== 2026) {
    throw new SalaryValidationError("taxYear", "目前仅支持2026纳税年度");
  }
  if (input.cityCode !== "shanghai" && input.cityCode !== "custom") {
    throw new SalaryValidationError("cityCode", "请选择上海或自定义地区");
  }
  if (input.mode !== "taxOnly" && input.mode !== "detailed") {
    throw new SalaryValidationError("mode", "请选择计算模式");
  }
  if (!Number.isInteger(input.startMonth) || input.startMonth < 1 || input.startMonth > 12) {
    throw new SalaryValidationError("startMonth", "入职月份须为1至12的整数");
  }
  const gross = amount(input.monthlyGross, "monthlyGross", "税前月薪");
  let grossByMonth = Array.from({ length: 12 }, () => gross);
  if (input.monthlyGrossOverrides !== undefined) {
    if (!Array.isArray(input.monthlyGrossOverrides) || input.monthlyGrossOverrides.length !== 12) {
      throw new SalaryValidationError("monthlyGrossOverrides", "逐月工资须填写完整12个月");
    }
    grossByMonth = input.monthlyGrossOverrides.map((item, index) =>
      amount(item, "monthlyGrossOverrides", `${index + 1}月税前工资`),
    );
  }
  const additional = optionalAmount(
    input.additionalDeductionsMonthly, "additionalDeductionsMonthly", "每月专项附加扣除",
  );
  const other = optionalAmount(input.otherDeductionsMonthly, "otherDeductionsMonthly", "每月其他扣除");
  const exempt = optionalAmount(input.exemptIncomeMonthly, "exemptIncomeMonthly", "每月免税收入");
  const rates = input.contributionRates ?? {};
  if (input.mode === "taxOnly") {
    return { grossByMonth, socialBase: undefined, housingBase: undefined, rates, additional, other, exempt };
  }

  const socialBase = amount(input.socialInsuranceBase, "socialInsuranceBase", "社保缴费基数", true).toString();
  const housingBase = amount(input.housingFundBase, "housingFundBase", "公积金缴费基数", true).toString();
  const socialBaseH2 = input.socialInsuranceBaseH2 === undefined ? undefined
    : amount(input.socialInsuranceBaseH2, "socialInsuranceBaseH2", "7—12月社保缴费基数", true).toString();
  const housingBaseH2 = input.housingFundBaseH2 === undefined ? undefined
    : amount(input.housingFundBaseH2, "housingFundBaseH2", "7—12月公积金缴费基数", true).toString();
  for (const half of ["housingH1", "housingH2"] as const) {
    const rate = percent(rates[half], `contributionRates.${half}`, `${half === "housingH1" ? "1—6月" : "7—12月"}个人公积金比例`);
    const allowed = input.cityCode === "shanghai"
      ? getPolicyForMonth("shanghai", 2026, half === "housingH1" ? 1 : 7).housingRateOptions
      : null;
    if (allowed && !allowed.some((candidate) => new Decimal(rate).eq(candidate))) {
      throw new SalaryValidationError(
        `contributionRates.${half}`,
        `上海普通住房公积金比例须为${allowed.map((item) => `${item}%`).join("、")}；特殊比例请使用自定义参数`,
      );
    }
  }
  if (input.cityCode === "custom") {
    for (const kind of ["pension", "medical", "unemployment"] as const) {
      percent(rates[kind], `contributionRates.${kind}`, `${kind}个人缴费比例`);
    }
  } else {
    const policyRates = getPolicyForMonth("shanghai", 2026, 7).personalRates;
    if (!policyRates) throw new Error("上海个人缴费费率政策缺失");
    for (const kind of ["pension", "medical", "unemployment"] as const) {
      if (rates[kind] !== undefined && !new Decimal(percent(rates[kind], `contributionRates.${kind}`, `${kind}个人缴费比例`)).eq(policyRates[kind])) {
        throw new SalaryValidationError(`contributionRates.${kind}`, "上海已核实的个人社保比例不得手动覆盖；请使用自定义参数");
      }
    }
  }
  return { grossByMonth, socialBase, housingBase, socialBaseH2, housingBaseH2, rates, additional, other, exempt };
}

function ratesForMonth(
  cityCode: CityCode,
  policy: MonthPolicy,
  userRates: ContributionRatesInput,
  month: number,
): PersonalRates & { housing: string } {
  const socialRates = cityCode === "shanghai" ? policy.personalRates : {
    pension: userRates.pension!, medical: userRates.medical!, unemployment: userRates.unemployment!,
  };
  if (!socialRates) throw new Error("政策缺少个人社保缴费比例");
  return { ...socialRates, housing: month <= 6 ? userRates.housingH1! : userRates.housingH2! };
}

export function calculateSalary(input: SalaryInput): SalaryResult {
  const valid = validateInput(input);
  const detailed = input.mode === "detailed";
  const warnings = new Set<string>();
  const assumptions = new Set<string>([
    "仅估算2026年单一扣缴单位居民个人按月工资薪金的累计预扣税额；不含奖金、特殊减免税额和年度汇算。",
    "金额按人民币分四舍五入，税款根据累计税额与此前实际预扣税额的差额计算。",
  ]);
  if (!detailed) {
    warnings.add("仅算个税，未扣除五险一金；结果余额不是实际到手工资。");
  } else if (input.cityCode === "shanghai") {
    warnings.add("上海失业保险个人0.5%按官方前后资料连续适用推定；请核对实际扣缴。");
    assumptions.add("上海社保缴费基数按各月有效上下限调整；社保各项个人缴费逐项按分四舍五入，公积金个人缴费按元四舍五入。");
    assumptions.add("公积金缴存比例由用户按单位实际选择填报，不含补充公积金。");
  } else {
    warnings.add("自定义地区的缴费基数和费率均为用户手填估计参数，未经本站核实。");
    assumptions.add("自定义模式不套用地区缴费基数上下限，各项个人缴费逐项按分四舍五入。");
    warnings.add("手动模式仅按基数乘费率计算，未计入地方固定附加费、特殊缴费或补缴；可能与完整工资条不同。");
  }

  let cumulativeGross = ZERO;
  let cumulativeExempt = ZERO;
  let cumulativeBasic = ZERO;
  let cumulativeSpecial = ZERO;
  let cumulativeAdditional = ZERO;
  let cumulativeOther = ZERO;
  let cumulativeWithholding = ZERO;
  let grossTotal = ZERO;
  let contributionsTotal = ZERO;
  let takeHomeTotal = ZERO;
  const months: MonthlyResult[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const employed = month >= input.startMonth;
    const policy = detailed ? getPolicyForMonth(input.cityCode, 2026, month) : null;
    const gross = employed ? valid.grossByMonth[month - 1] : ZERO;
    const breakdown = employed && detailed && policy
      ? computeMonthlyContributions(policy, {
          socialInsuranceBase: month >= 7 ? valid.socialBaseH2 ?? valid.socialBase! : valid.socialBase!,
          housingFundBase: month >= 7 ? valid.housingBaseH2 ?? valid.housingBase! : valid.housingBase!,
          rates: ratesForMonth(input.cityCode, policy, valid.rates, month),
        })
      : { ...EMPTY_CONTRIBUTIONS };
    const contribution = Object.values(breakdown).reduce(
      (sum, value) => sum.plus(value), ZERO,
    );
    const basic = employed ? new Decimal(BASIC_DEDUCTION_MONTHLY) : ZERO;
    const additional = employed ? valid.additional : ZERO;
    if (employed) {
      cumulativeGross = cumulativeGross.plus(gross);
      cumulativeExempt = cumulativeExempt.plus(valid.exempt);
      cumulativeBasic = cumulativeBasic.plus(basic);
      cumulativeSpecial = cumulativeSpecial.plus(contribution);
      cumulativeAdditional = cumulativeAdditional.plus(additional);
      cumulativeOther = cumulativeOther.plus(valid.other);
    }
    const cumulativeTaxable = Decimal.max(
      0,
      cumulativeGross.minus(cumulativeExempt).minus(cumulativeBasic)
        .minus(cumulativeSpecial).minus(cumulativeAdditional).minus(cumulativeOther),
    );
    const targetTax = new Decimal(calculateCumulativeTax(cumulativeTaxable));
    if (employed && targetTax.lt(cumulativeWithholding)) {
      warnings.add("累计应预扣税额低于已扣税额时，本工具不自动退税；请按实际汇算或扣缴更正处理。");
    }
    const currentTax = employed ? Decimal.max(0, targetTax.minus(cumulativeWithholding)) : ZERO;
    cumulativeWithholding = cumulativeWithholding.plus(currentTax);
    const takeHome = gross.minus(contribution).minus(currentTax);
    if (takeHome.isNegative()) {
      warnings.add("有月份的估算个人缴费超过当月工资，出现负数余额；请核对缴费与发薪情况。");
    }
    grossTotal = grossTotal.plus(gross);
    contributionsTotal = contributionsTotal.plus(contribution);
    takeHomeTotal = takeHomeTotal.plus(takeHome);
    months.push({
      month,
      gross: moneyString(gross),
      contributionsByType: breakdown,
      contributionsTotal: moneyString(contribution),
      basicDeduction: moneyString(basic),
      additionalDeduction: moneyString(additional),
      otherDeduction: moneyString(employed ? valid.other : ZERO),
      exemptIncome: moneyString(employed ? valid.exempt : ZERO),
      cumulativeTaxable: moneyString(cumulativeTaxable),
      cumulativeWithholding: moneyString(cumulativeWithholding),
      currentTax: moneyString(currentTax),
      takeHome: moneyString(takeHome),
      policyVersion: policy?.id ?? NATIONAL_POLICY_ID,
    });
  }
  return {
    months,
    grossTotal: moneyString(grossTotal),
    personalContributionsTotal: moneyString(contributionsTotal),
    taxWithheldTotal: moneyString(cumulativeWithholding),
    takeHomeTotal: moneyString(takeHomeTotal),
    warnings: [...warnings],
    assumptions: [...assumptions],
  };
}
