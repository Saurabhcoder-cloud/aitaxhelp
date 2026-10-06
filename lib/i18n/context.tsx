"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  SupportedLocale,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  LocaleMetadata,
  normalizeLocale,
  getLocaleMetadata,
} from "./locales";
import { translate } from "./dictionary";

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  metadata: LocaleMetadata;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  metadata: getLocaleMetadata(DEFAULT_LOCALE),
  isRTL: false,
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    return normalizeLocale(initialLocale || DEFAULT_LOCALE);
  });

  // Client-side initialization: inspect cookies, localStorage, or browser language
  useEffect(() => {
    let resolvedLocale: SupportedLocale = locale;

    // 1. Cookie
    const cookieVal = getCookie(LOCALE_COOKIE_NAME);
    if (cookieVal) {
      resolvedLocale = normalizeLocale(cookieVal);
    } else {
      // 2. LocalStorage
      try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored) {
          resolvedLocale = normalizeLocale(stored);
        } else if (typeof navigator !== "undefined" && navigator.language) {
          // 3. Browser language
          const navLang = navigator.language.split("-")[0];
          resolvedLocale = normalizeLocale(navLang);
        }
      } catch (_e) {
        // Storage access might fail in private windows
      }
    }

    if (resolvedLocale !== locale) {
      setLocaleState(resolvedLocale);
    }

    // Set document HTML attributes
    const meta = getLocaleMetadata(resolvedLocale);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    const norm = normalizeLocale(newLocale);
    setLocaleState(norm);

    // 1. Sync Cookie
    setCookie(LOCALE_COOKIE_NAME, norm);

    // 2. Sync LocalStorage
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, norm);
    } catch (_e) {
      // Ignore
    }

    // 3. Update DOM attributes
    const meta = getLocaleMetadata(norm);
    if (typeof document !== "undefined") {
      document.documentElement.lang = meta.code;
      document.documentElement.dir = meta.dir;
    }

    // 4. Dispatch custom event for decoupled listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("taxaihelp-locale-change", { detail: { locale: norm } }));
    }

    // 5. Asynchronously persist to server if authenticated
    try {
      fetch("/api/v1/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: norm }),
      }).catch(() => {
        // Non-blocking
      });
    } catch (_e) {
      // Non-blocking
    }
  }, []);

  const metadata = useMemo(() => getLocaleMetadata(locale), [locale]);
  const isRTL = metadata.dir === "rtl";

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      metadata,
      isRTL,
    }),
    [locale, setLocale, t, metadata, isRTL]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
