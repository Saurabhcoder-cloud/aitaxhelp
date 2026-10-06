/**
 * TaxAIHelp Multilingual Architecture — Phase 12-A
 * Supported Locales Registry & Configuration
 *
 * Languages:
 * 1. en — English (Default, 100% full coverage)
 * 2. es — Español / Spanish (Highest Priority, 100% full coverage)
 * 3. zh — 简体中文 / Chinese (Architecture ready & foundational catalog)
 * 4. vi — Tiếng Việt / Vietnamese (Architecture ready & foundational catalog)
 * 5. ko — 한국어 / Korean (Architecture ready & foundational catalog)
 * 6. ru — Русский / Russian (Architecture ready & foundational catalog)
 * 7. pt — Português / Portuguese (Architecture ready & foundational catalog)
 * 8. tl — Tagalog / Filipino (Architecture ready & foundational catalog)
 */

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "zh",
  "vi",
  "ko",
  "ru",
  "pt",
  "tl",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_COOKIE_NAME = "taxaihelp-locale";
export const LOCALE_STORAGE_KEY = "taxaihelp-locale";

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
  status: "full" | "prepared";
  ietfTag: string; // e.g. en-US, es-US
}

export const LOCALE_REGISTRY: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English (US)",
    dir: "ltr",
    flag: "🇺🇸",
    status: "full",
    ietfTag: "en-US",
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    dir: "ltr",
    flag: "🇪🇸",
    status: "full",
    ietfTag: "es-US",
  },
  zh: {
    code: "zh",
    name: "Chinese",
    nativeName: "简体中文",
    dir: "ltr",
    flag: "🇨🇳",
    status: "prepared",
    ietfTag: "zh-CN",
  },
  vi: {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    dir: "ltr",
    flag: "🇻🇳",
    status: "prepared",
    ietfTag: "vi-VN",
  },
  ko: {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    dir: "ltr",
    flag: "🇰🇷",
    status: "prepared",
    ietfTag: "ko-KR",
  },
  ru: {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    dir: "ltr",
    flag: "🇷🇺",
    status: "prepared",
    ietfTag: "ru-RU",
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    dir: "ltr",
    flag: "🇧🇷",
    status: "prepared",
    ietfTag: "pt-BR",
  },
  tl: {
    code: "tl",
    name: "Tagalog",
    nativeName: "Tagalog",
    dir: "ltr",
    flag: "🇵🇭",
    status: "prepared",
    ietfTag: "tl-PH",
  },
};

/**
 * Validates if an arbitrary string is a supported locale.
 */
export function isSupportedLocale(locale: unknown): locale is SupportedLocale {
  return typeof locale === "string" && SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Normalizes input (e.g. "es-MX", "ES", "es_US") into a canonical SupportedLocale.
 */
export function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw || typeof raw !== "string") {
    return DEFAULT_LOCALE;
  }
  const clean = raw.trim().toLowerCase().split(/[-_]/)[0];
  if (isSupportedLocale(clean)) {
    return clean;
  }
  return DEFAULT_LOCALE;
}

/**
 * Returns metadata for a given locale, falling back to default.
 */
export function getLocaleMetadata(locale?: string | null): LocaleMetadata {
  const norm = normalizeLocale(locale);
  return LOCALE_REGISTRY[norm];
}
