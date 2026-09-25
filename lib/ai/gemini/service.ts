import { callGeminiApi } from "./client";
import { SYSTEM_PROMPTS } from "./prompts";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
} from "@/tax-engine";
import {
  TaxCalculationResult,
  TaxYear,
  TaxFilingStatus,
} from "@/types/tax";
import {
  AIAssistantRequest,
  AIAssistantResponse,
  TaxIntentCategory,
} from "@/types/ai";
import { AuthenticatedUser } from "@/lib/auth/session";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { ConversationStore } from "@/lib/services/conversation-store";
import { RateLimiter } from "@/lib/utils/rate-limiter";
import { AppError } from "@/lib/utils/errors";
import { toCents, formatCurrencyFromCents } from "@/lib/utils/currency";

export interface DeterministicTaxToolInput {
  taxYear?: TaxYear;
  filingStatus?: TaxFilingStatus;
  w2WagesCents?: number;
  otherIncomeCents?: number;
  federalWithholdingCents?: number;
  gross1099IncomeCents?: number;
  businessExpensesCents?: number;
  estimatedAnnualGrossCents?: number;
  estimatedAnnualExpensesCents?: number;
}

/**
 * STEP 7: Constrained server-side tool boundary around the deterministic tax engine.
 * Gemini NEVER calculates or mutates tax numbers; all numerical outputs come strictly from this function.
 */
export function calculateFederalTax(inputs: DeterministicTaxToolInput): TaxCalculationResult {
  const taxYear = inputs.taxYear || 2025;
  const filingStatus = inputs.filingStatus || "single";

  // 1. Self-Employed / 1099 Calculation
  if (
    (inputs.gross1099IncomeCents && inputs.gross1099IncomeCents > 0) ||
    (inputs.businessExpensesCents && inputs.businessExpensesCents > 0)
  ) {
    return calculateSelfEmployedTax({
      taxYear,
      filingStatus,
      gross1099IncomeCents: inputs.gross1099IncomeCents || 0,
      businessExpensesCents: inputs.businessExpensesCents || 0,
      w2WagesCents: inputs.w2WagesCents || 0,
      federalWithholdingCents: inputs.federalWithholdingCents || 0,
    });
  }

  // 2. Quarterly Estimated Tax Calculation
  if (inputs.estimatedAnnualGrossCents && inputs.estimatedAnnualGrossCents > 0) {
    return calculateQuarterlyTax({
      taxYear,
      filingStatus,
      estimatedAnnualGrossCents: inputs.estimatedAnnualGrossCents,
      estimatedAnnualExpensesCents: inputs.estimatedAnnualExpensesCents || 0,
      w2AnnualWagesCents: inputs.w2WagesCents || 0,
      w2AnnualWithholdingCents: inputs.federalWithholdingCents || 0,
    });
  }

  // 3. Form 1040 Income Tax Calculation
  return calculateIncomeTax({
    taxYear,
    filingStatus,
    w2WagesCents: inputs.w2WagesCents || 0,
    otherIncomeCents: inputs.otherIncomeCents || 0,
    federalWithholdingCents: inputs.federalWithholdingCents || 0,
    itemizedDeductionCents: 0,
  });
}

/**
 * Quick heuristic detection of prompt injection attempts.
 */
function containsInjectionPatterns(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("ignore previous instructions") ||
    lower.includes("ignore all previous instructions") ||
    lower.includes("act as the irs") ||
    lower.includes("act as irs") ||
    lower.includes("reveal your system prompt") ||
    lower.includes("reveal system prompt") ||
    lower.includes("reveal your prompt") ||
    lower.includes("reveal the api key") ||
    lower.includes("reveal api key") ||
    lower.includes("ignore the deterministic tax engine") ||
    lower.includes("use your own tax calculations") ||
    lower.includes("guarantee me a refund")
  );
}

/**
 * Quick heuristic detection of intent and numerical parameters from text.
 */
function extractHeuristicParameters(message: string): {
  intent: TaxIntentCategory;
  parameters: DeterministicTaxToolInput;
  hasEnoughDataForCalc: boolean;
} {
  const lower = message.toLowerCase();

  // Unsupported requests (State taxes, non-US, evasion)
  if (
    lower.includes("state tax") ||
    lower.includes("california tax") ||
    lower.includes("new york tax") ||
    lower.includes("evade") ||
    lower.includes("e-file") ||
    lower.includes("submit to irs")
  ) {
    return {
      intent: "UNSUPPORTED_REQUEST",
      parameters: {},
      hasEnoughDataForCalc: false,
    };
  }

  // Calculator guidance
  if (
    lower.includes("which calculator") ||
    lower.includes("what calculator") ||
    lower.includes("where do i calculate")
  ) {
    return {
      intent: "CALCULATOR_GUIDANCE",
      parameters: {},
      hasEnoughDataForCalc: false,
    };
  }

  // Quarterly estimate intent
  if (
    lower.includes("quarterly") ||
    lower.includes("1040-es") ||
    lower.includes("estimated tax deadline") ||
    lower.includes("installment")
  ) {
    return {
      intent: "QUARTERLY_ESTIMATE",
      parameters: {},
      hasEnoughDataForCalc: false,
    };
  }

  // Check for income numbers (e.g. $75,000, 75000, 75k)
  const incomeRegex = /\$?(\d{1,3}(?:,\d{3})+|\d+)(?:k|\s*thousand)?/i;
  const isCalcRequest =
    lower.includes("calculate") ||
    lower.includes("how much tax") ||
    lower.includes("what do i owe") ||
    lower.includes("what will i owe") ||
    lower.includes("estimate tax") ||
    lower.includes("i made") ||
    lower.includes("salary");

  let w2Income = 0;
  const is1099 = lower.includes("1099") || lower.includes("self-employed") || lower.includes("freelance");
  let filingStatus: TaxFilingStatus = "single";
  let taxYear: TaxYear = 2025;

  if (lower.includes("married filing jointly") || lower.includes("jointly")) {
    filingStatus = "married_filing_jointly";
  } else if (lower.includes("head of household")) {
    filingStatus = "head_of_household";
  } else if (lower.includes("married filing separately")) {
    filingStatus = "married_filing_separately";
  }

  if (lower.includes("2026")) {
    taxYear = 2026;
  } else if (lower.includes("2024")) {
    taxYear = 2024;
  }

  const match = message.match(incomeRegex);
  if (match) {
    const rawVal = match[1].replace(/,/g, "");
    let num = parseFloat(rawVal);
    if (match[0].toLowerCase().includes("k") || match[0].toLowerCase().includes("thousand")) {
      num = num * 1000;
    }
    if (num > 0) {
      w2Income = num;
    }
  }

  if (isCalcRequest && w2Income > 0) {
    return {
      intent: "CALCULATE_TAX",
      parameters: is1099
        ? {
            taxYear,
            filingStatus,
            gross1099IncomeCents: toCents(w2Income),
            businessExpensesCents: 0,
          }
        : {
            taxYear,
            filingStatus,
            w2WagesCents: toCents(w2Income),
          },
      hasEnoughDataForCalc: true,
    };
  }

  if (isCalcRequest && w2Income === 0) {
    return {
      intent: "CALCULATE_TAX",
      parameters: {},
      hasEnoughDataForCalc: false,
    };
  }

  return {
    intent: "GENERAL_TAX_QUESTION",
    parameters: {},
    hasEnoughDataForCalc: false,
  };
}

/**
 * Builds a deterministic factual fallback explanation when Gemini is unavailable.
 */
function buildDeterministicSummary(
  result: TaxCalculationResult,
  prefix = "Here is the verified calculation from the deterministic tax engine:"
): string {
  const isQuarterly = result.calculatorType === "quarterly_tax";
  const quarterly = result.quarterlyBreakdown;
  const refundOrDue =
    result.estimatedRefundCents > 0
      ? `Estimated Refund: **${formatCurrencyFromCents(result.estimatedRefundCents)}**`
      : result.estimatedAmountOwedCents > 0
      ? `Estimated Balance Due: **${formatCurrencyFromCents(result.estimatedAmountOwedCents)}**`
      : "Tax position is fully balanced ($0.00).";

  if (isQuarterly && quarterly) {
    return `${prefix}

- **Estimated Payment Per Quarter**: ${formatCurrencyFromCents(quarterly.quarterlyPaymentCents)}
- **Projected Annual Federal Liability**: ${formatCurrencyFromCents(quarterly.estimatedAnnualTaxCents)}
- **Remaining Balance to Pay**: ${formatCurrencyFromCents(quarterly.remainingTaxToPayCents)}
- **Tax Year**: ${result.taxYear} (${result.rulesVersion})
- **Engine Version**: ${result.engineVersion}

*Notice: This is an educational estimate computed strictly by the TaxAIHelp deterministic tax engine under statutory IRS guidelines. It does not constitute legal or certified CPA advice.*`;
  }

  return `${prefix}

- **Gross Income**: ${formatCurrencyFromCents(result.grossIncomeCents)}
- **Standard Deduction**: ${formatCurrencyFromCents(result.deductionUsedCents)}
- **Taxable Ordinary Income**: ${formatCurrencyFromCents(result.taxableIncomeCents)}
- **Total Federal Tax Liability**: ${formatCurrencyFromCents(result.totalTaxLiabilityCents)}
- **Effective Tax Rate**: ${(result.effectiveTaxRate * 100).toFixed(1)}%
- **Top Marginal Bracket**: ${(result.marginalTaxBracket * 100).toFixed(0)}%
- ${refundOrDue}

*Notice: This estimate is computed deterministically under IRS rules for Tax Year ${result.taxYear} (Engine v${result.engineVersion}, Ruleset ${result.rulesVersion}). It is not official CPA advice.*`;
}

/**
 * Main Pipeline Orchestrator:
 * User Message
 * ↓
 * Authentication & Rate Limiting
 * ↓
 * Intent Detection & Historical Context Retrieval
 * ↓
 * Deterministic Tax Engine Boundary (Zero LLM Math)
 * ↓
 * Gemini Explanation Layer (With Strict Compliance Mandates & Fallbacks)
 * ↓
 * Conversation Store
 * ↓
 * Verified Response
 */
export async function processAssistantRequest(
  user: AuthenticatedUser,
  request: AIAssistantRequest
): Promise<AIAssistantResponse> {
  // 1. Rate Limiting Check
  const rateLimit = RateLimiter.check(user.id);
  if (!rateLimit.allowed) {
    throw new AppError(
      "Too many requests. Please wait a moment before sending another message.",
      429,
      "RATE_LIMITED"
    );
  }

  // 2. Get or initialize conversation session
  const conversation = await ConversationStore.getOrCreateConversation(
    user.id,
    request.conversationId
  );

  // 3. Save incoming user message
  await ConversationStore.saveMessage(
    conversation.id,
    user.id,
    "user",
    request.message,
    request.calculationId
  );

  // 4. Prompt injection defense
  if (containsInjectionPatterns(request.message)) {
    const defenseAnswer =
      "I am an educational AI tax assistant built to explain verified federal tax concepts and calculations. " +
      "I cannot override system instructions, act as an IRS official, guarantee refunds, or alter deterministic tax engine outputs. " +
      "Please let me know how I can help explain federal tax rules or guide you to our calculators.";

    await ConversationStore.saveMessage(
      conversation.id,
      user.id,
      "assistant",
      defenseAnswer
    );

    return {
      answer: defenseAnswer,
      intent: "GENERAL_TAX_QUESTION",
      conversationId: conversation.id,
      suggestedActions: [
        { label: "Browse Calculators", href: "/tax-calculators" },
        { label: "Standard Deductions", action: "What is the 2025 standard deduction?" },
      ],
    };
  }

  // 5. Historical Calculation Context (if calculationId is supplied)
  if (request.calculationId) {
    const historicalCalc = await TaxCalculationStore.getById(
      request.calculationId,
      user.id
    );

    if (!historicalCalc) {
      throw new AppError(
        "Referenced calculation was not found or access is denied.",
        404,
        "NOT_FOUND"
      );
    }

    // STRICT: Historical calculations are NEVER recalculated.
    const res = historicalCalc.resultSnapshot;

    let explanation = "";
    try {
      const prompt = `The user is asking: "${request.message}"\n\n` +
        `Explain this verified deterministic tax calculation snapshot without changing any numbers:\n` +
        `- Calculation Title: ${historicalCalc.title}\n` +
        `- Tax Year: ${historicalCalc.taxYear}\n` +
        `- Filing Status: ${historicalCalc.filingStatus}\n` +
        `- Gross Income: ${formatCurrencyFromCents(res.grossIncomeCents)}\n` +
        `- Standard Deduction: ${formatCurrencyFromCents(res.deductionUsedCents)}\n` +
        `- Taxable Income: ${formatCurrencyFromCents(res.taxableIncomeCents)}\n` +
        `- Federal Liability: ${formatCurrencyFromCents(res.totalTaxLiabilityCents)}\n` +
        `- Effective Rate: ${(res.effectiveTaxRate * 100).toFixed(1)}%\n` +
        `- Engine Version: ${historicalCalc.engineVersion}\n` +
        `- Ruleset: ${historicalCalc.rulesVersion}\n`;

      explanation = await callGeminiApi(SYSTEM_PROMPTS.taxExplainer, prompt);
    } catch (_err) {
      explanation = buildDeterministicSummary(
        res,
        `Here is the verified historical snapshot for **${historicalCalc.title}**:`
      );
    }

    await ConversationStore.saveMessage(
      conversation.id,
      user.id,
      "assistant",
      explanation,
      historicalCalc.id
    );

    return {
      answer: explanation,
      intent: "EXPLAIN_CALCULATION",
      calculation: {
        result: res,
        engineVersion: historicalCalc.engineVersion,
        rulesVersion: historicalCalc.rulesVersion,
        isHistorical: true,
      },
      conversationId: conversation.id,
      suggestedActions: [
        { label: "View in Dashboard", href: `/dashboard/calculations/${historicalCalc.id}` },
        { label: "All Saved Calculations", href: "/dashboard/calculations" },
      ],
    };
  }

  // 6. Intent Classification & Parameter Extraction
  const heuristic = extractHeuristicParameters(request.message);
  let verifiedCalculation: TaxCalculationResult | undefined;

  if (heuristic.intent === "UNSUPPORTED_REQUEST") {
    const answer =
      "TaxAIHelp is currently focused strictly on US Federal income taxes, Self-Employment taxes (Schedule SE), and Form 1040-ES quarterly estimated taxes. " +
      "We do not compute state or local taxes, international taxes, or support formal e-filing with the IRS. For state or specialized filings, we recommend consulting a licensed CPA or Enrolled Agent.";

    await ConversationStore.saveMessage(conversation.id, user.id, "assistant", answer);

    return {
      answer,
      intent: "UNSUPPORTED_REQUEST",
      conversationId: conversation.id,
      suggestedActions: [
        { label: "View Federal Calculators", href: "/tax-calculators" },
        { label: "Tax Disclaimers", href: "/disclaimer" },
      ],
    };
  }

  if (heuristic.intent === "CALCULATOR_GUIDANCE") {
    const answer =
      "We offer 4 deterministic federal tax calculators tailored to your taxpayer situation:\n\n" +
      "1. **Federal Income Tax Calculator**: Progressive brackets and standard deduction for W-2 earners.\n" +
      "2. **Self-Employed Tax Calculator**: Form 1040 Schedule SE Social Security and Medicare calculations.\n" +
      "3. **1099 Contractor Tax Calculator**: Tracks business expense deductions and recommended savings.\n" +
      "4. **Quarterly Estimated Tax Calculator**: Form 1040-ES payment installment deadlines and safe harbor rules.";

    await ConversationStore.saveMessage(conversation.id, user.id, "assistant", answer);

    return {
      answer,
      intent: "CALCULATOR_GUIDANCE",
      conversationId: conversation.id,
      suggestedActions: [
        { label: "Income Tax Calculator", href: "/tax-calculators/income-tax" },
        { label: "Self-Employed Calculator", href: "/tax-calculators/self-employed" },
        { label: "1099 Calculator", href: "/tax-calculators/1099" },
        { label: "Quarterly Calculator", href: "/tax-calculators/quarterly-tax" },
      ],
    };
  }

  if (heuristic.intent === "QUARTERLY_ESTIMATE") {
    const answer =
      "For US taxpayers with 1099 or self-employment income, the IRS generally expects estimated tax payments across 4 statutory deadlines:\n\n" +
      "- **Q1 (Jan 1 – Mar 31)**: Due April 15\n" +
      "- **Q2 (Apr 1 – May 31)**: Due June 15\n" +
      "- **Q3 (Jun 1 – Aug 31)**: Due September 15\n" +
      "- **Q4 (Sep 1 – Dec 31)**: Due January 15 (following calendar year)\n\n" +
      "Under the IRS Safe Harbor rule, you can avoid underpayment penalties by paying at least 90% of your current year liability or 100% of your prior year tax (110% if prior AGI was above $150k).";

    await ConversationStore.saveMessage(conversation.id, user.id, "assistant", answer);

    return {
      answer,
      intent: "QUARTERLY_ESTIMATE",
      conversationId: conversation.id,
      suggestedActions: [
        { label: "Calculate 1040-ES Installments", href: "/tax-calculators/quarterly-tax" },
      ],
    };
  }

  // 7. Calculate Tax Intent
  if (heuristic.intent === "CALCULATE_TAX") {
    if (heuristic.hasEnoughDataForCalc) {
      // Deterministic engine calculation
      verifiedCalculation = calculateFederalTax(heuristic.parameters);

      let explanation = "";
      try {
        const prompt = `The user asked: "${request.message}"\n\n` +
          `Explain this deterministic federal tax result:\n` +
          `- Tax Year: ${verifiedCalculation.taxYear}\n` +
          `- Filing Status: ${verifiedCalculation.filingStatus}\n` +
          `- Gross Income: ${formatCurrencyFromCents(verifiedCalculation.grossIncomeCents)}\n` +
          `- Standard Deduction: ${formatCurrencyFromCents(verifiedCalculation.deductionUsedCents)}\n` +
          `- Taxable Income: ${formatCurrencyFromCents(verifiedCalculation.taxableIncomeCents)}\n` +
          `- Federal Income Tax: ${formatCurrencyFromCents(verifiedCalculation.federalIncomeTaxCents)}\n` +
          `- Self-Employment Tax: ${formatCurrencyFromCents(verifiedCalculation.selfEmploymentTaxCents)}\n` +
          `- Total Federal Liability: ${formatCurrencyFromCents(verifiedCalculation.totalTaxLiabilityCents)}\n` +
          `- Effective Rate: ${(verifiedCalculation.effectiveTaxRate * 100).toFixed(1)}%\n` +
          `- Engine: ${verifiedCalculation.engineVersion}\n` +
          `- Rules: ${verifiedCalculation.rulesVersion}\n`;

        explanation = await callGeminiApi(SYSTEM_PROMPTS.taxExplainer, prompt);
      } catch (_err) {
        explanation = buildDeterministicSummary(
          verifiedCalculation,
          "Here is your verified federal tax estimate based on official IRS formulas:"
        );
      }

      await ConversationStore.saveMessage(
        conversation.id,
        user.id,
        "assistant",
        explanation
      );

      return {
        answer: explanation,
        intent: "CALCULATE_TAX",
        calculation: {
          result: verifiedCalculation,
          engineVersion: verifiedCalculation.engineVersion,
          rulesVersion: verifiedCalculation.rulesVersion,
        },
        conversationId: conversation.id,
        suggestedActions: [
          { label: "Open in Income Tax Calculator", href: "/tax-calculators/income-tax" },
          { label: "Open in 1099 Calculator", href: "/tax-calculators/1099" },
        ],
      };
    } else {
      const askForInputs =
        "To calculate your federal tax accurately with our deterministic engine, I need a bit more information:\n\n" +
        "1. Your estimated annual income (W-2 salary or 1099 gross revenue)\n" +
        "2. Your filing status (Single, Married Filing Jointly, Head of Household, etc.)\n" +
        "3. Any business expenses if you are self-employed\n\n" +
        "You can reply with these numbers or jump directly to our interactive calculator:";

      await ConversationStore.saveMessage(conversation.id, user.id, "assistant", askForInputs);

      return {
        answer: askForInputs,
        intent: "CALCULATE_TAX",
        conversationId: conversation.id,
        suggestedActions: [
          { label: "Launch Income Tax Calculator", href: "/tax-calculators/income-tax" },
          { label: "Launch Self-Employed Calculator", href: "/tax-calculators/self-employed" },
        ],
      };
    }
  }

  // 8. General Educational Tax Question
  let generalAnswer = "";
  try {
    const prompt = `User question: "${request.message}"\nProvide a clear, accurate, educational response based on standard US federal tax rules.`;
    generalAnswer = await callGeminiApi(SYSTEM_PROMPTS.taxExplainer, prompt);
  } catch (_err) {
    generalAnswer =
      "For individual taxpayers in 2025, standard deductions are $15,750 for Single filers, $31,500 for Married Filing Jointly, and $23,625 for Head of Household. " +
      "Ordinary income is taxed across 7 progressive statutory rate brackets (10%, 12%, 22%, 24%, 32%, 35%, and 37%). " +
      "For detailed scenarios, you can run our interactive calculators below.";
  }

  await ConversationStore.saveMessage(conversation.id, user.id, "assistant", generalAnswer);

  return {
    answer: generalAnswer,
    intent: "GENERAL_TAX_QUESTION",
    conversationId: conversation.id,
    suggestedActions: [
      { label: "Calculate Federal Tax", href: "/tax-calculators" },
      { label: "Quarterly Deadlines", action: "When are quarterly taxes due?" },
    ],
  };
}
