import { callGeminiApi } from "./client";
import { SYSTEM_PROMPTS } from "./prompts";
import { geminiExtractedIntentSchema, GeminiExtractedIntent } from "./schemas";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
} from "@/tax-engine";
import { TaxCalculationResult } from "@/types/tax";
import { toCents, formatCurrencyFromCents } from "@/lib/utils/currency";

export interface AssistantServiceResponse {
  answer: string;
  verifiedCalculation?: TaxCalculationResult;
  suggestedFollowUps: string[];
}

/**
 * Strict Pipeline Orchestrator:
 * User -> Intent Extraction -> Zod Validation -> Deterministic Tax Engine -> Verified Result -> Gemini Explainer -> UI
 */
export async function processTaxUserMessage(
  userMessage: string
): Promise<AssistantServiceResponse> {
  // Step 1: Extract intent and parameters via AI
  let extractedIntent: GeminiExtractedIntent;
  try {
    const rawIntentResponse = await callGeminiApi(
      SYSTEM_PROMPTS.intentExtraction,
      `User query: "${userMessage}"\nExtract intent and numbers strictly according to schema.`
    );
    const parsed = JSON.parse(rawIntentResponse);
    extractedIntent = geminiExtractedIntentSchema.parse(parsed);
  } catch (_e) {
    // Fallback if parsing or unconfigured
    extractedIntent = {
      intent: "ask_question",
      confidence: 0.8,
      extractedParameters: {
        taxYear: 2025,
        filingStatus: "single",
      },
      missingRequiredFields: [],
    };
  }

  let verifiedCalculation: TaxCalculationResult | undefined;

  // Step 2: Route to deterministic Tax Engine if calculation parameters exist
  if (
    extractedIntent.intent === "calculate_tax" ||
    extractedIntent.calculatorType === "income_tax" ||
    (extractedIntent.extractedParameters.w2Income && extractedIntent.extractedParameters.w2Income > 0)
  ) {
    if (extractedIntent.extractedParameters.selfEmploymentIncome) {
      verifiedCalculation = calculateSelfEmployedTax({
        taxYear: extractedIntent.extractedParameters.taxYear ?? 2025,
        filingStatus: extractedIntent.extractedParameters.filingStatus ?? "single",
        gross1099IncomeCents: toCents(extractedIntent.extractedParameters.selfEmploymentIncome),
        businessExpensesCents: toCents(extractedIntent.extractedParameters.businessExpenses ?? 0),
        w2WagesCents: toCents(extractedIntent.extractedParameters.w2Income ?? 0),
        federalWithholdingCents: toCents(extractedIntent.extractedParameters.withholding ?? 0),
      });
    } else {
      verifiedCalculation = calculateIncomeTax({
        taxYear: extractedIntent.extractedParameters.taxYear ?? 2025,
        filingStatus: extractedIntent.extractedParameters.filingStatus ?? "single",
        w2WagesCents: toCents(extractedIntent.extractedParameters.w2Income ?? 50000),
        federalWithholdingCents: toCents(extractedIntent.extractedParameters.withholding ?? 0),
        itemizedDeductionCents: toCents(extractedIntent.extractedParameters.itemizedDeductions ?? 0),
      });
    }
  }

  // Step 3: Generate educational explanation based on verified calculation or tax guidance
  let answer: string;
  if (verifiedCalculation) {
    const refundOrOwedText =
      verifiedCalculation.estimatedRefundCents > 0
        ? `Estimated Refund: ${formatCurrencyFromCents(verifiedCalculation.estimatedRefundCents)}`
        : `Estimated Amount Owed: ${formatCurrencyFromCents(verifiedCalculation.estimatedAmountOwedCents)}`;

    answer = `Based on the IRS ${verifiedCalculation.taxYear} tax tables calculated by the TaxAIHelp deterministic tax engine:

- **Gross Income**: ${formatCurrencyFromCents(verifiedCalculation.grossIncomeCents)}
- **Deduction (${verifiedCalculation.deductionType})**: ${formatCurrencyFromCents(verifiedCalculation.deductionUsedCents)}
- **Taxable Income**: ${formatCurrencyFromCents(verifiedCalculation.taxableIncomeCents)}
- **Federal Tax Liability**: ${formatCurrencyFromCents(verifiedCalculation.totalTaxLiabilityCents)}
- **Effective Tax Rate**: ${(verifiedCalculation.effectiveTaxRate * 100).toFixed(1)}%
- **${refundOrOwedText}**

*Disclaimer: This is an educational estimate computed using standard IRS rules. It does not account for state taxes, special credits, or unique local deductions. Always consult a licensed CPA or EA.*`;
  } else {
    answer = `I can help you understand US federal tax rules, deductions, and bracket structures for individual taxpayers, freelancers, 1099 contractors, and small business owners.

To calculate your taxes deterministically, tell me your estimated income (W-2 or 1099), filing status, and any deductible expenses, or try our specialized interactive calculators below.`;
  }

  return {
    answer,
    verifiedCalculation,
    suggestedFollowUps: [
      "How do standard deductions work for 2024?",
      "What business expenses can 1099 contractors write off?",
      "How are quarterly estimated taxes calculated?",
    ],
  };
}
