import Decimal from "decimal.js";
import { getTaxBracket } from "./brackets";
import { moneyString } from "./money";

export function calculateCumulativeTax(taxableAmount: Decimal.Value): string {
  const taxable = new Decimal(taxableAmount);
  if (!taxable.isFinite() || taxable.isNegative()) {
    throw new Error("累计应纳税所得额必须是非负有限金额");
  }
  const bracket = getTaxBracket(taxable);
  return moneyString(
    Decimal.max(0, taxable.mul(bracket.rate).minus(bracket.quickDeduction)),
  );
}
