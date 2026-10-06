import { SupportedLocale, DEFAULT_LOCALE, normalizeLocale } from "./locales";
import { CATALOGS, enCatalog } from "./catalogs";

/**
 * Replaces `{paramName}` placeholders in a translated string.
 */
export function interpolate(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params || Object.keys(params).length === 0) {
    return text;
  }

  return text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, key) => {
    if (key in params && params[key] !== undefined && params[key] !== null) {
      return String(params[key]);
    }
    return `{${key}}`;
  });
}

/**
 * Traverses a nested object using dot-delimited path (e.g. "nav.taxCalculators").
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Translates a key for a given locale, with robust fallback:
 * 1. Requested Locale
 * 2. English (DEFAULT_LOCALE)
 * 3. Key string itself
 */
export function translate(
  locale: string | null | undefined,
  key: string,
  params?: Record<string, string | number>
): string {
  const normLocale = normalizeLocale(locale);
  const catalog = CATALOGS[normLocale] || enCatalog;

  // 1. Try requested catalog
  let value = getNestedValue(catalog, key);

  // 2. Fallback to English catalog if missing
  if (!value && normLocale !== DEFAULT_LOCALE) {
    value = getNestedValue(enCatalog, key);
  }

  // 3. Fallback to raw key if not found in any catalog
  if (!value) {
    return key;
  }

  // Interpolate parameters
  return interpolate(value, params);
}

/**
 * Factory for creating a scoped translation function for a specific locale.
 */
export function createTranslator(locale: string | null | undefined) {
  const norm = normalizeLocale(locale);
  return (key: string, params?: Record<string, string | number>) =>
    translate(norm, key, params);
}
