import Decimal from "decimal.js";
import nationalPolicy from "@/config/policies/cn-2026-national.json";
import { parseNationalPolicy } from "@/lib/policy/schemas";

const rule = parseNationalPolicy(nationalPolicy);

export const NATIONAL_POLICY_ID = rule.id;
export const BASIC_DEDUCTION_MONTHLY = rule.basicDeductionMonthly;

export interface TaxBracket {
  upper: string | null;
  rate: string;
  quickDeduction: string;
}

export function getTaxBracket(taxable: Decimal): TaxBracket {
  const bracket = rule.brackets.find(
    (entry) => entry.upper === null || taxable.lte(entry.upper),
  );
  if (!bracket) throw new Error("2026年累计预扣税率表不完整");
  return bracket;
}
