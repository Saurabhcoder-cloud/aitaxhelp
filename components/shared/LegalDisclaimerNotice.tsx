"use client";

import React from "react";
import Link from "next/link";
import { Alert } from "../ui/Alert";
import { useI18n } from "../../lib/i18n";

export function LegalDisclaimerNotice({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();

  if (compact) {
    return (
      <div className="text-xs text-surface-600 bg-surface-50 border border-surface-200 rounded-lg p-3 leading-relaxed">
        <span className="font-semibold text-surface-800">
          {locale === "es" ? "Aviso Informativo: " : "Educational Notice: "}
        </span>
        {t("footer.disclaimerText")}{" "}
        <Link href="/disclaimer" className="text-brand-600 hover:underline">
          {t("footer.disclaimer")}
        </Link>
      </div>
    );
  }

  return (
    <Alert
      variant="info"
      title={locale === "es" ? "Aviso Informativo de Estimación Fiscal" : "Educational Tax Estimation Notice"}
      className="my-6"
    >
      {t("footer.disclaimerText")}{" "}
      <Link href="/disclaimer" className="font-semibold text-brand-700 underline ml-1">
        {locale === "es" ? "Conozca más sobre nuestros estándares" : "Learn more about our standards"}
      </Link>
      .
    </Alert>
  );
}
