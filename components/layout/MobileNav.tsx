"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV_ITEMS } from "../../lib/constants/navigation";
import { Button } from "../ui/Button";
import { ClientUserSession } from "../../lib/utils/auth-client";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { LanguageSelector } from "../shared/LanguageSelector";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  session?: ClientUserSession | null;
  onSignOut?: () => Promise<void>;
}

export function MobileNav({ isOpen, onClose, session, onSignOut }: MobileNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  if (!isOpen) return null;

  const isAuthenticated = Boolean(session && session.id);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white p-6 shadow-xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-surface-200">
            <Link href="/" onClick={onClose} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
                T
              </div>
              <span className="font-bold text-lg text-surface-900 tracking-tight">
                TaxAI<span className="text-brand-600">Help</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-700 focus:outline-none"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 flex flex-col space-y-4">
            {MAIN_NAV_ITEMS.map((item) => (
              <div key={item.title} className="flex flex-col space-y-2">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="font-semibold text-surface-900 hover:text-brand-600 transition-colors text-base"
                >
                  {item.title}
                </Link>
                {item.children && (
                  <div className="pl-4 flex flex-col space-y-2 border-l-2 border-surface-100">
                    {item.children.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href}
                        onClick={onClose}
                        className="text-sm text-surface-600 hover:text-brand-600 transition-colors"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Language Selector in Mobile Drawer */}
            <div className="pt-3 border-t border-surface-100">
              <LanguageSelector variant="mobile" />
            </div>

            {/* Auth-Aware Navigation Links */}
            <div className="pt-3 border-t border-surface-100 flex flex-col space-y-2.5">
              {isAuthenticated ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t("nav.taxpayerAccount")}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={onClose}
                    className={`flex items-center gap-2 font-semibold transition-colors text-base ${
                      pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                        ? "text-brand-600"
                        : "text-brand-700 hover:text-brand-900"
                    }`}
                  >
                    <User className="w-4 h-4 text-brand-600" />
                    <span>{t("nav.dashboard")}</span>
                  </Link>
                  <Link
                    href="/dashboard/taxes"
                    onClick={onClose}
                    className="text-sm font-medium text-surface-700 hover:text-brand-600 transition-colors pl-6"
                  >
                    {t("nav.startMyTaxes")}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      if (onSignOut) {
                        await onSignOut();
                      }
                      onClose();
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-red-600 transition-colors text-left pt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-surface-400" />
                    <span>{t("nav.signOut")}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className={`font-semibold transition-colors text-base ${
                      pathname === "/login"
                        ? "text-brand-600 font-bold"
                        : "text-brand-700 hover:text-brand-900"
                    }`}
                  >
                    {t("nav.signIn")} →
                  </Link>
                  <Link
                    href="/signup"
                    onClick={onClose}
                    className="text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
                  >
                    {t("nav.createAccount")}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>

        {/* Footer CTAs */}
        <div className="mt-8 pt-6 border-t border-surface-200 flex flex-col space-y-3">
          <Button
            href={isAuthenticated ? "/dashboard/taxes" : "/login?next=/dashboard/taxes"}
            onClick={onClose}
            size="md"
            className="w-full font-medium shadow-sm"
          >
            {t("nav.calculateYourTaxes")}
          </Button>
          <Button
            href="/ai-tax-assistant"
            onClick={onClose}
            variant="outline"
            size="md"
            className="w-full font-medium"
          >
            {t("nav.aiTaxAssistant")}
          </Button>
        </div>
      </div>
    </div>
  );
}
