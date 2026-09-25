import { TaxCalculationResult } from "@/types/tax";

export interface CalculateApiResponse {
  success: boolean;
  data?: TaxCalculationResult;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Invokes the existing /api/v1/tax/calculate endpoint with runtime validation.
 * Never exposes stack traces or raw errors to callers.
 */
export async function requestTaxCalculation(
  calculatorType: "income_tax" | "self_employed" | "1099" | "quarterly_tax",
  payload: unknown
): Promise<CalculateApiResponse> {
  try {
    const res = await fetch("/api/v1/tax/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        calculatorType,
        payload,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(json.error?.details)) {
        json.error.details.forEach((d: { field: string; message: string }) => {
          if (d.field) {
            fieldErrors[d.field] = d.message;
          }
        });
      }

      return {
        success: false,
        error: json.error?.message || "Calculation request failed. Please check your inputs.",
        fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      };
    }

    return {
      success: true,
      data: json.data as TaxCalculationResult,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Unable to connect to the calculation service. Please check your connection and try again.",
    };
  }
}
