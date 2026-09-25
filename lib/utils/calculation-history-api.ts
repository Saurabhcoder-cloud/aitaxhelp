import { TaxCalculationRecord, SaveCalculationRequest } from "@/types/tax";

export interface HistoryApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_DEV_SESSION_TOKEN = "taxaihelp-local-dev-session-token";

export function getClientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const customToken = window.sessionStorage.getItem("taxaihelp_session_token");
    const token = customToken || DEFAULT_DEV_SESSION_TOKEN;
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Saves a completed tax calculation to the user's history.
 */
export async function saveCalculation(
  payload: SaveCalculationRequest
): Promise<HistoryApiResponse<TaxCalculationRecord>> {
  try {
    const res = await fetch("/api/v1/tax/calculations", {
      method: "POST",
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to save calculation.",
      };
    }

    return {
      success: true,
      data: json.data as TaxCalculationRecord,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while saving calculation.",
    };
  }
}

/**
 * Fetches the calculation history list for the current authenticated user.
 */
export async function fetchCalculationHistory(): Promise<
  HistoryApiResponse<TaxCalculationRecord[]>
> {
  try {
    const res = await fetch("/api/v1/tax/calculations", {
      method: "GET",
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to load calculation history.",
      };
    }

    return {
      success: true,
      data: json.data as TaxCalculationRecord[],
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while fetching calculations.",
    };
  }
}

/**
 * Fetches a single calculation record by ID.
 */
export async function fetchCalculationById(
  id: string
): Promise<HistoryApiResponse<TaxCalculationRecord>> {
  try {
    const res = await fetch(`/api/v1/tax/calculations/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Calculation not found.",
      };
    }

    return {
      success: true,
      data: json.data as TaxCalculationRecord,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while fetching calculation detail.",
    };
  }
}

/**
 * Deletes a single calculation record by ID.
 */
export async function deleteCalculation(
  id: string
): Promise<HistoryApiResponse<{ deleted: boolean; id: string }>> {
  try {
    const res = await fetch(`/api/v1/tax/calculations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getClientAuthHeaders(),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to delete calculation.",
      };
    }

    return {
      success: true,
      data: json.data,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while deleting calculation.",
    };
  }
}

/**
 * Renames a calculation title.
 */
export async function updateCalculationTitle(
  id: string,
  title: string
): Promise<HistoryApiResponse<TaxCalculationRecord>> {
  try {
    const res = await fetch(`/api/v1/tax/calculations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ title }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to update calculation title.",
      };
    }

    return {
      success: true,
      data: json.data as TaxCalculationRecord,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while renaming calculation.",
    };
  }
}
