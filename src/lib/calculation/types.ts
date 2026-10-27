import type { CityCode } from "@/lib/policy/schemas";
import type { ContributionBreakdown, MonthlyContributionDetails } from "./contributions";

export interface ContributionRatesInput {
  pension?: string;
  medical?: string;
  unemployment?: string;
  housingH1?: string;
  housingH2?: string;
}

export interface SalaryInput {
  taxYear: 2026;
  cityCode: CityCode;
  mode: "taxOnly" | "detailed";
  startMonth: number;
  monthlyGross: string;
  monthlyGrossOverrides?: string[];
  socialInsuranceBase?: string;
  housingFundBase?: string;
  socialInsuranceBaseH2?: string;
  housingFundBaseH2?: string;
  contributionRates?: ContributionRatesInput;
  additionalDeductionsMonthly?: string;
  otherDeductionsMonthly?: string;
  exemptIncomeMonthly?: string;
}

export interface MonthlyResult {
  month: number;
  gross: string;
  contributionsByType: ContributionBreakdown;
  contributionsTotal: string;
  contributionDetails: MonthlyContributionDetails | null;
  basicDeduction: string;
  additionalDeduction: string;
  otherDeduction: string;
  exemptIncome: string;
  cumulativeTaxable: string;
  cumulativeWithholding: string;
  currentTax: string;
  takeHome: string;
  policyVersion: string;
  policyVerifiedAt: string;
  policySources: { label: string; url: string }[];
}

export interface SalaryResult {
  months: MonthlyResult[];
  grossTotal: string;
  personalContributionsTotal: string;
  additionalDeductionsTotal: string;
  taxWithheldTotal: string;
  takeHomeTotal: string;
  warnings: string[];
  assumptions: string[];
}
