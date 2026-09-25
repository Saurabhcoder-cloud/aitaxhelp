import { TaxBracket, TaxBracketBreakdownItem } from "../../types/tax";

export interface BracketCalculationOutput {
  federalIncomeTaxCents: number;
  marginalRate: number;
  breakdown: TaxBracketBreakdownItem[];
}

/**
 * Deterministically computes federal income tax across progressive tax brackets.
 * All math strictly computed in integer cents with rounding at final bracket aggregation.
 */
export function calculateProgressiveTax(
  taxableIncomeCents: number,
  brackets: TaxBracket[]
): BracketCalculationOutput {
  if (taxableIncomeCents <= 0) {
    return {
      federalIncomeTaxCents: 0,
      marginalRate: brackets[0]?.rate ?? 0.1,
      breakdown: [],
    };
  }

  let totalTaxCents = 0;
  let highestMarginalRate = brackets[0]?.rate ?? 0.1;
  const breakdown: TaxBracketBreakdownItem[] = [];

  for (const bracket of brackets) {
    if (taxableIncomeCents <= bracket.minCents) {
      break;
    }

    const bracketCeiling = bracket.maxCents ?? Infinity;
    const taxableInThisBracket = Math.min(
      taxableIncomeCents - bracket.minCents,
      bracketCeiling - bracket.minCents
    );

    if (taxableInThisBracket > 0) {
      const taxForBracket = Math.round(taxableInThisBracket * bracket.rate);
      totalTaxCents += taxForBracket;
      highestMarginalRate = bracket.rate;

      const minDollars = bracket.minCents / 100;
      const maxDollars = bracket.maxCents ? bracket.maxCents / 100 : null;
      const rangeLabel = maxDollars
        ? `$${minDollars.toLocaleString()} - $${maxDollars.toLocaleString()}`
        : `Over $${minDollars.toLocaleString()}`;

      breakdown.push({
        rate: bracket.rate,
        bracketRange: rangeLabel,
        taxableAmountInBracketCents: taxableInThisBracket,
        taxInBracketCents: taxForBracket,
      });
    }
  }

  return {
    federalIncomeTaxCents: totalTaxCents,
    marginalRate: highestMarginalRate,
    breakdown,
  };
}
