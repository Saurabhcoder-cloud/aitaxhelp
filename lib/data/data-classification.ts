import {
  DatasetKey,
  DataClassification,
} from "@/types/data-management";
import { DATA_CATALOG } from "./data-catalog";

export const PROHIBITED_OPERATIONAL_FIELDS: readonly string[] = [
  "ssn",
  "tin",
  "itin",
  "ein",
  "bankAccount",
  "bank_account",
  "routingNumber",
  "routing_number",
  "creditCard",
  "credit_card",
  "cvv",
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "jwt",
  "apiKey",
  "api_key",
  "geminiApiKey",
  "supabaseServiceKey",
  "stripeSecretKey",
  "w2WagesCents",
  "w2_wages_cents",
  "gross1099IncomeCents",
  "gross_1099_income_cents",
  "businessExpensesCents",
  "business_expenses_cents",
  "taxLiabilityCents",
  "tax_liability_cents",
  "refundOrOwedCents",
  "refund_or_owed_cents",
  "totalIncomeCents",
  "total_income_cents",
  "taxableIncomeCents",
  "taxable_income_cents",
  "wages",
  "refund",
  "taxLiability",
] as const;

export class DataClassificationService {
  /**
   * Retrieves the formal security and privacy classification for a dataset.
   */
  public static getClassification(dataset: DatasetKey): DataClassification {
    const item = DATA_CATALOG[dataset];
    return item ? item.classification : "INTERNAL";
  }

  /**
   * Evaluates if a dataset contains sensitive taxpayer financial data.
   */
  public static isSensitiveTaxData(dataset: DatasetKey): boolean {
    const item = DATA_CATALOG[dataset];
    return item?.classification === "SENSITIVE_TAX" || !!item?.containsTaxpayerInfo;
  }

  /**
   * Evaluates if a dataset contains security-sensitive secrets or audit traces.
   */
  public static isSecuritySensitive(dataset: DatasetKey): boolean {
    const item = DATA_CATALOG[dataset];
    return item?.classification === "SECURITY_SENSITIVE" || !!item?.containsSecurityInfo;
  }

  /**
   * Verifies that an arbitrary operational object does NOT contain prohibited tax/security values.
   */
  public static containsProhibitedFields(obj: unknown): boolean {
    if (!obj || typeof obj !== "object") return false;

    const keys = Object.keys(obj as Record<string, unknown>);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (
        PROHIBITED_OPERATIONAL_FIELDS.some(
          (prohibited) => lower === prohibited.toLowerCase()
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Sanitizes an operational object, stripping all prohibited taxpayer or secret fields.
   */
  public static sanitizeOperationalData<T extends Record<string, unknown>>(
    input: T
  ): Record<string, unknown> {
    if (!input || typeof input !== "object") return {};

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      const isProhibited = PROHIBITED_OPERATIONAL_FIELDS.some(
        (p) => lower === p.toLowerCase()
      );

      if (!isProhibited) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          sanitized[key] = this.sanitizeOperationalData(
            value as Record<string, unknown>
          );
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  }
}
