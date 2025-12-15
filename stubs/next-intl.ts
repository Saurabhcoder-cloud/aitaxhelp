import React from "react";

type Translator = ((key: string, values?: Record<string, any>) => string) & {
  raw: (key: string) => any;
};

export function useTranslations(): Translator {
  const translate = ((key: string, values?: Record<string, any>) =>
    values ? `${key}:${JSON.stringify(values)}` : key) as Translator;
  translate.raw = () => [];
  return translate;
}

export function useLocale(): string {
  return "en";
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
