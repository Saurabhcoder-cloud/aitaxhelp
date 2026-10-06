"use client";

import React from "react";
import Link from "next/link";
import { FOOTER_SECTIONS } from "../../lib/constants/navigation";
import { useI18n } from "../../lib/i18n";
import { LanguageSelector } from "../shared/LanguageSelector";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useI18n();

  return (
    <footer className="bg-navy-950 text-surface-300 border-t border-navy-900 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 pb-12 border-b border-surface-800">
          {/* Brand Info */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-base">
                T
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                TaxAI<span className="text-brand-400">Help</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-surface-400 max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-surface-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-900 border border-surface-800 text-surface-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {t("common.officialIrsVerifiedNotice")}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-900 border border-surface-800 text-surface-300">
                Deterministic Engine v1.1
              </span>
            </div>
          </div>

          {/* Links Columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                {section.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-surface-300 hover:text-white transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Regulatory & Safety Disclaimer */}
        <div className="mt-8 pt-6 text-xs text-surface-400 leading-relaxed border-t border-navy-900/60">
          <p className="font-semibold text-surface-300 mb-1">
            {t("footer.complianceNotice")}
          </p>
          <p>
            {t("footer.disclaimerText")}
          </p>
        </div>

        {/* Copyright & Language Selector */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-400 gap-4">
          <p>© {currentYear} TaxAIHelp. {t("footer.allRightsReserved")} taxaihelp.com</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/privacy" className="hover:text-surface-300">{t("footer.privacyPolicy")}</Link>
            <Link href="/terms" className="hover:text-surface-300">{t("footer.termsOfService")}</Link>
            <Link href="/disclaimer" className="hover:text-surface-300">{t("footer.disclaimer")}</Link>
            <LanguageSelector variant="header" />
          </div>
        </div>
      </div>
    </footer>
  );
}
