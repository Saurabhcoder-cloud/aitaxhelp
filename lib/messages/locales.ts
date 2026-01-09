import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import zh from "./zh.json";
import ar from "./ar.json";
import hi from "./hi.json";
import pt from "./pt.json";
import ru from "./ru.json";
import ja from "./ja.json";

export type Locale = "en" | "es" | "fr" | "de" | "zh" | "ar" | "hi" | "pt" | "ru" | "ja";

const withFallback = (localeMessages: Record<string, unknown>) => ({
  ...en,
  ...localeMessages,
});

export const messages: Record<Locale, Record<string, unknown>> = {
  en,
  es: withFallback(es),
  fr: withFallback(fr),
  de: withFallback(de),
  zh: withFallback(zh),
  ar: withFallback(ar),
  hi: withFallback(hi),
  pt: withFallback(pt),
  ru: withFallback(ru),
  ja: withFallback(ja),
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
