/**
 * Calculator Input Validation Utilities
 *
 * Enforces strict validation on monetary inputs before passing to the
 * deterministic Tax Engine or API layer.
 * Rejects negative numbers, NaN/Infinity, empty values (when required),
 * and prevents silent coercion of invalid financial data.
 */

export interface CurrencyValidationResult {
  isValid: boolean;
  dollars: number;
  cents: number;
  error?: string;
}

export interface CurrencyValidationOptions {
  required?: boolean;
  fieldName?: string;
  maxDollars?: number;
  allowZero?: boolean;
}

/**
 * Validates a formatted currency string input (e.g. "75,000", "$1,250.50", "0").
 * Returns integer cents and validation error if invalid.
 */
export function validateCurrencyInput(
  rawInput: string | number,
  options: CurrencyValidationOptions = {}
): CurrencyValidationResult {
  const {
    required = false,
    fieldName = "Amount",
    maxDollars = 1_000_000_000, // $1 Billion max bound
    allowZero = true,
  } = options;

  // Handle number input directly
  if (typeof rawInput === "number") {
    if (isNaN(rawInput) || !isFinite(rawInput)) {
      return {
        isValid: false,
        dollars: 0,
        cents: 0,
        error: `Please enter a valid numeric ${fieldName.toLowerCase()}.`,
      };
    }
    if (rawInput < 0) {
      return {
        isValid: false,
        dollars: 0,
        cents: 0,
        error: `${fieldName} cannot be negative.`,
      };
    }
    if (!allowZero && rawInput === 0) {
      return {
        isValid: false,
        dollars: 0,
        cents: 0,
        error: `${fieldName} must be greater than zero.`,
      };
    }
    if (rawInput > maxDollars) {
      return {
        isValid: false,
        dollars: 0,
        cents: 0,
        error: `${fieldName} exceeds maximum allowable limit ($1,000,000,000).`,
      };
    }
    const cents = Math.round(rawInput * 100);
    return { isValid: true, dollars: rawInput, cents };
  }

  const str = String(rawInput ?? "").trim();

  // Empty check
  if (!str) {
    if (required) {
      return {
        isValid: false,
        dollars: 0,
        cents: 0,
        error: `${fieldName} is required.`,
      };
    }
    return { isValid: true, dollars: 0, cents: 0 };
  }

  // Explicit check for negative sign
  if (str.includes("-")) {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `${fieldName} cannot be negative.`,
    };
  }

  // Strip currency symbols and formatting commas
  const cleaned = str.replace(/[$,\s]/g, "");

  // Check for invalid characters or multiple decimals
  if (!/^\d*(\.\d{1,2})?$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `Please enter a valid dollar amount for ${fieldName.toLowerCase()}.`,
    };
  }

  const num = parseFloat(cleaned);

  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `Please enter a valid numeric ${fieldName.toLowerCase()}.`,
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `${fieldName} cannot be negative.`,
    };
  }

  if (!allowZero && num === 0) {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `${fieldName} must be greater than zero.`,
    };
  }

  if (num > maxDollars) {
    return {
      isValid: false,
      dollars: 0,
      cents: 0,
      error: `${fieldName} exceeds maximum allowable limit ($1,000,000,000).`,
    };
  }

  const cents = Math.round(num * 100);

  return {
    isValid: true,
    dollars: num,
    cents,
  };
}
