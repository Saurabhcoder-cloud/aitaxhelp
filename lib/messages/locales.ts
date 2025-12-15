import en from "./en.json";

export type Locale = "en" | "es" | "fr" | "de" | "zh" | "ar" | "hi" | "pt" | "ru" | "ja";

export const messages: Record<Locale, Record<string, unknown>> = {
  en,
  es: {},
  fr: {},
  de: {},
  zh: {},
  ar: {},
  hi: {},
  pt: {},
  ru: {},
  ja: {},
};

export const supportedLocales: Locale[] = [
  "en",
  "es",
  "fr",
  "de",
  "zh",
  "ar",
  "hi",
  "pt",
  "ru",
  "ja",
];
