import { TaxCalculationResult } from "./tax";

export type MessageRole = "user" | "assistant" | "system";

export type TaxIntentCategory =
  | "GENERAL_TAX_QUESTION"
  | "EXPLAIN_CALCULATION"
  | "CALCULATE_TAX"
  | "QUARTERLY_ESTIMATE"
  | "CALCULATOR_GUIDANCE"
  | "UNSUPPORTED_REQUEST";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  intent?: TaxIntentCategory;
  verifiedCalculation?: TaxCalculationResult;
  suggestedActions?: Array<{
    label: string;
    href?: string;
    action?: string;
  }>;
}

export interface AIMessageRecord {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachedCalculationId?: string;
  createdAt: string;
}

export interface AIAssistantRequest {
  message: string;
  calculationId?: string;
  conversationId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface AIAssistantResponse {
  answer: string;
  intent: TaxIntentCategory;
  calculation?: {
    result: TaxCalculationResult;
    engineVersion: string;
    rulesVersion: string;
    isHistorical?: boolean;
  };
  suggestedActions?: Array<{
    label: string;
    href?: string;
    action?: string;
  }>;
  warnings?: string[];
  conversationId: string;
}

export interface ExtractedTaxIntent {
  intent: TaxIntentCategory;
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

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
