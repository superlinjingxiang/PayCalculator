import Decimal from "decimal.js";

export const ZERO = new Decimal(0);

export function money(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function moneyString(value: Decimal.Value): string {
  return money(value).toFixed(2);
}
