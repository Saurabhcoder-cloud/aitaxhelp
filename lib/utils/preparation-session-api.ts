import { getClientAuthHeaders } from "./calculation-history-api";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { IncomeDiscovery } from "@/lib/preparation/income";
import { DocumentsInput } from "@/lib/validations/preparation-documents";
import { DeductionDiscovery } from "@/lib/preparation/deductions";
import { PreparationStep } from "@/lib/preparation/steps";
import { HouseholdInput } from "@/lib/validations/preparation-household";
import { HouseholdSnapshot } from "@/lib/preparation/household";

export interface PreparationSessionApiResponse {
  success: boolean;
  data?: TaxPreparationSession | null;
  error?: string;
}

export async function fetchCurrentPreparationSession(): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session", { method: "GET" });
}

export async function startPreparationSession(): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function savePreparationHousehold(
  household: HouseholdInput | HouseholdSnapshot
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session/household", {
    method: "PUT",
    body: JSON.stringify(household),
  });
}

export async function savePreparationIncome(
  income: IncomeDiscovery
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session/income", {
    method: "PUT",
    body: JSON.stringify(income),
  });
}

export async function savePreparationDocuments(
  documents: DocumentsInput
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session/documents", {
    method: "PUT",
    body: JSON.stringify(documents),
  });
}

export async function savePreparationDeductions(
  deductions: Omit<DeductionDiscovery, "saved">
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session/deductions", {
    method: "PUT",
    body: JSON.stringify(deductions),
  });
}

export async function updatePreparationProgress(
  completeStep: PreparationStep
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session", {
    method: "PATCH",
    body: JSON.stringify({ completeStep }),
  });
}

export async function navigateToPreparationStep(
  navigateToStep: PreparationStep
): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session", {
    method: "PATCH",
    body: JSON.stringify({ navigateToStep }),
  });
}

export async function calculatePreparationSession(): Promise<PreparationSessionApiResponse> {
  return requestPreparationSession("/api/v1/tax/preparation/session/calculate", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function requestPreparationSession(
  url: string,
  init: RequestInit
): Promise<PreparationSessionApiResponse> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Unable to load the tax preparation session.",
      };
    }
    return {
      success: true,
      data: json.data as TaxPreparationSession | null,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while loading the tax preparation session.",
    };
  }
}
