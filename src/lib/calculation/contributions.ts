import Decimal from "decimal.js";
import type { Bounds, MonthPolicy } from "@/lib/policy/schemas";
import { moneyString } from "./money";

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

function effectiveBase(input: string, limits: Bounds | null): Decimal {
  const base = new Decimal(input);
  if (!base.isFinite() || base.isNegative()) throw new Error("缴费基数必须是非负金额");
  return limits ? Decimal.min(Decimal.max(base, limits.minimum), limits.maximum) : base;
}

export function computeMonthlyContributions(
  rule: MonthPolicy,
  input: ContributionInput,
): ContributionBreakdown {
  const socialBase = effectiveBase(input.socialInsuranceBase, rule.socialBase);
  const housingBase = effectiveBase(input.housingFundBase, rule.housingBase);
  const contribution = (base: Decimal, rate: string) =>
    moneyString(base.mul(new Decimal(rate)).div(100));
  const housingRaw = housingBase.mul(input.rates.housing).div(100);
  const housing = rule.housingRounding === "whole-yuan-half-up"
    ? housingRaw.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(2)
    : moneyString(housingRaw);

  return {
    pension: contribution(socialBase, input.rates.pension),
    medical: contribution(socialBase, input.rates.medical),
    unemployment: contribution(socialBase, input.rates.unemployment),
    housing,
  };
}
