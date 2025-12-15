"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/lib/messages/en.json";
import { Locale, messages } from "@/lib/messages/locales";

interface Props {
  children: ReactNode;
}

export function LocaleProvider({ children }: Props) {
  const [locale, setLocale] = useState<Locale>("en");
  const [currentMessages, setCurrentMessages] = useState<Record<string, unknown>>(enMessages as Record<string, unknown>);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("taxhelp-locale") as Locale | null;
    if (savedLocale && messages[savedLocale]) {
      setLocale(savedLocale);
      setCurrentMessages(messages[savedLocale] || enMessages);
    }
  }, []);

  const switchLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    window.localStorage.setItem("taxhelp-locale", nextLocale);
    setCurrentMessages(messages[nextLocale] || enMessages);
  };

  const value = useMemo(() => ({ locale, switchLocale }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={currentMessages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

interface LocaleContextValue {
  locale: Locale;
  switchLocale: (locale: Locale) => void;
}

export const LocaleContext = React.createContext<LocaleContextValue>({
  locale: "en",
  switchLocale: () => {},
});
