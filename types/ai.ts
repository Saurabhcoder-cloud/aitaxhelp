import { TaxCalculationResult } from "./tax";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  verifiedCalculation?: TaxCalculationResult;
  suggestedActions?: Array<{
    label: string;
    href?: string;
    action?: string;
  }>;
}

export interface ExtractedTaxIntent {
  intent: "calculate_tax" | "ask_question" | "explain_deduction" | "quarterly_estimate" | "unknown";
  confidence: number;
  extractedParameters: {
    taxYear?: number;
    filingStatus?: string;
    w2Income?: number;
    selfEmploymentIncome?: number;
    expenses?: number;
    withholding?: number;
    topic?: string;
  };
  missingRequiredFields: string[];
}

export interface AIExplanationRequest {
  userQuery: string;
  calculationContext?: TaxCalculationResult;
  userContext?: {
    filingStatus: string;
    taxYear: number;
  };
}

export interface AIExplanationResponse {
  summary: string;
  breakdownExplanation: string[];
  actionableInsights: string[];
  disclaimers: string[];
}
