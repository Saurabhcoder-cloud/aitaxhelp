import { TaxYear } from "../../types/tax";

export interface QuarterlyVoucher {
  quarter: string;
  dueDate: string;
  amountCents: number;
}

export interface QuarterlyCalculationOutput {
  estimatedAnnualTaxLiabilityCents: number;
  remainingTaxToPayCents: number;
  quarterlyPaymentCents: number;
  vouchers: QuarterlyVoucher[];
}

/**
 * Calculates estimated quarterly tax payments (Form 1040-ES).
 * Divides net estimated annual liability across the 4 IRS payment periods.
 */
export function calculateQuarterlySchedule(
  taxYear: TaxYear,
  annualTotalTaxCents: number,
  annualWithholdingCents: number = 0
): QuarterlyCalculationOutput {
  const remainingTaxCents = Math.max(0, annualTotalTaxCents - annualWithholdingCents);
  const quarterlyPaymentCents = Math.round(remainingTaxCents / 4);

  // Cent-accurate voucher distribution:
  // Base voucher is floor(remaining / 4).
  // Any remainder cents (0, 1, 2, or 3) are deterministically allocated +1 cent to earlier quarters (Q1, Q2, Q3).
  // This guarantees the 4 vouchers sum EXACTLY to remainingTaxCents with zero cent drift and zero negative vouchers.
  const baseVoucherCents = Math.floor(remainingTaxCents / 4);
  const remainderCents = remainingTaxCents % 4;

  const vouchers: QuarterlyVoucher[] = [
    {
      quarter: "Q1",
      dueDate: `April 15, ${taxYear}`,
      amountCents: baseVoucherCents + (remainderCents >= 1 ? 1 : 0),
    },
    {
      quarter: "Q2",
      dueDate: `June 15, ${taxYear}`,
      amountCents: baseVoucherCents + (remainderCents >= 2 ? 1 : 0),
    },
    {
      quarter: "Q3",
      dueDate: `September 15, ${taxYear}`,
      amountCents: baseVoucherCents + (remainderCents >= 3 ? 1 : 0),
    },
    {
      quarter: "Q4",
      dueDate: `January 15, ${taxYear + 1}`,
      amountCents: baseVoucherCents,
    },
  ];

  return {
    estimatedAnnualTaxLiabilityCents: annualTotalTaxCents,
    remainingTaxToPayCents: remainingTaxCents,
    quarterlyPaymentCents,
    vouchers,
  };
}
