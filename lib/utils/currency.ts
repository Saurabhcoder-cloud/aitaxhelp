/**
 * Currency & Integer-Cents Mathematical Utilities
 * All internal engine calculations must operate strictly in integer cents
 * to prevent IEEE 754 floating-point rounding errors.
 */

export type Cents = number;
export type Dollars = number;

/**
 * Converts a dollar amount to integer cents (e.g., 100.50 -> 10050).
 */
export function toCents(dollars: number): Cents {
  if (isNaN(dollars) || !isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Converts integer cents to a standard decimal dollar amount.
 */
export function toDollars(cents: Cents): Dollars {
  if (isNaN(cents) || !isFinite(cents)) return 0;
  return cents / 100;
}

/**
 * Formats integer cents into a localized USD currency string.
 * Example: 125000 -> "$1,250.00" or "$1,250"
 */
export function formatCurrencyFromCents(
  cents: Cents,
  options: { includeDecimals?: boolean } = { includeDecimals: true }
): string {
  const dollars = toDollars(cents);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.includeDecimals ? 2 : 0,
    maximumFractionDigits: options.includeDecimals ? 2 : 0,
  }).format(dollars);
}

/**
 * Formats a regular dollar number into a localized USD currency string.
 */
export function formatCurrency(
  dollars: Dollars,
  options: { includeDecimals?: boolean } = { includeDecimals: true }
): string {
  if (isNaN(dollars) || !isFinite(dollars)) dollars = 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.includeDecimals ? 2 : 0,
    maximumFractionDigits: options.includeDecimals ? 2 : 0,
  }).format(dollars);
}

/**
 * Safely parses user string input into a sanitized dollar numeric value.
 */
export function parseDollarInput(input: string | number): number {
  if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, input);
  const cleaned = input.replace(/[^0-9.-]+/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.max(0, val);
}

/**
 * Clamps a numeric value between a minimum and maximum bound.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
