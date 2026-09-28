import { TaxFilingStatus, TaxYear, TaxCalculationResult, TaxCalculationRecord } from "./tax";

export type { TaxCalculationRecord };

export type UserRole = "user" | "admin" | "super_admin" | "compliance_officer" | "support_specialist";

export interface LeadInternalNote {
  id: string;
  adminUserId: string;
  note: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role?: UserRole;
  createdAt: string;
  updatedAt: string;
}


export interface TaxProfile {
  id: string;
  userId: string;
  defaultTaxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  hasW2Income: boolean;
  has1099Income: boolean;
  hasBusinessExpenses: boolean;
  stateOfResidence?: string;
  updatedAt: string;
}

export interface SavedCalculation {
  id: string;
  userId?: string;
  title: string;
  calculatorType: string;
  inputs: Record<string, unknown>;
  results: TaxCalculationResult;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachedCalculationId?: string;
  createdAt: string;
}

export interface TaxProfessionalLead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  taxPayerType: "individual" | "freelancer_1099" | "small_business";
  urgency: "immediate" | "this_month" | "planning_ahead";
  estimatedAnnualIncomeRange: string;
  notes?: string;
  internalNotes?: LeadInternalNote[];
  status: "new" | "contacted" | "matched" | "archived";
  createdAt: string;
}

