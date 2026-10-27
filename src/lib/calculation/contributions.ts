import Decimal from "decimal.js";
import type { Bounds, MonthPolicy } from "@/lib/policy/schemas";
import { moneyString } from "./money";

export type BaseAdjustment = "minimum" | "maximum" | null;

export interface ContributionInput {
  socialInsuranceBase: string;
  housingFundBase: string;
  rates: {
    pension: string;
    medical: string;
    unemployment: string;
    housing: string;
  };
}

export interface ContributionBreakdown {
  pension: string;
  medical: string;
  unemployment: string;
  housing: string;
}

export interface ContributionBaseResult {
  entered: string;
  effective: string;
  adjustedBy: BaseAdjustment;
}

export interface ContributionRateResult {
  pension: string;
  medical: string;
  unemployment: string;
  housing: string;
}

export interface MonthlyContributionDetails {
  contributions: ContributionBreakdown;
  socialInsuranceBase: ContributionBaseResult;
  housingFundBase: ContributionBaseResult;
  rates: ContributionRateResult;
}

function effectiveBase(input: string, limits: Bounds | null): ContributionBaseResult {
  const base = new Decimal(input);
  if (!base.isFinite() || base.isNegative()) throw new Error("缴费基数必须是非负金额");
  if (!limits) {
    return { entered: moneyString(base), effective: moneyString(base), adjustedBy: null };
  }
  const minimum = new Decimal(limits.minimum);
  const maximum = new Decimal(limits.maximum);
  const effective = Decimal.min(Decimal.max(base, minimum), maximum);
  const adjustedBy = effective.eq(minimum) && base.lt(minimum)
    ? "minimum"
    : effective.eq(maximum) && base.gt(maximum)
      ? "maximum"
      : null;
  return { entered: moneyString(base), effective: moneyString(effective), adjustedBy };
}

export function computeMonthlyContributionDetails(
  rule: MonthPolicy,
  input: ContributionInput,
): MonthlyContributionDetails {
  const socialBase = effectiveBase(input.socialInsuranceBase, rule.socialBase);
  const housingBase = effectiveBase(input.housingFundBase, rule.housingBase);
  const contribution = (base: Decimal, rate: string) =>
    moneyString(base.mul(new Decimal(rate)).div(100));
  const housingRaw = new Decimal(housingBase.effective).mul(input.rates.housing).div(100);
  const housing = rule.housingRounding === "whole-yuan-half-up"
    ? housingRaw.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(2)
    : moneyString(housingRaw);

  return {
    contributions: {
      pension: contribution(new Decimal(socialBase.effective), input.rates.pension),
      medical: contribution(new Decimal(socialBase.effective), input.rates.medical),
      unemployment: contribution(new Decimal(socialBase.effective), input.rates.unemployment),
      housing,
    },
    socialInsuranceBase: socialBase,
    housingFundBase: housingBase,
    rates: { ...input.rates },
  };
}

export function computeMonthlyContributions(
  rule: MonthPolicy,
  input: ContributionInput,
): ContributionBreakdown {
  return computeMonthlyContributionDetails(rule, input).contributions;
}
