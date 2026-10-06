"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n, SUPPORTED_LOCALES, LOCALE_REGISTRY, SupportedLocale } from "@/lib/i18n";
import { Globe, Check, ChevronDown } from "lucide-react";

export interface LanguageSelectorProps {
  variant?: "header" | "mobile" | "compact";
  className?: string;
}

export function LanguageSelector({ variant = "header", className = "" }: LanguageSelectorProps) {
  const { locale, setLocale, metadata, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  if (variant === "mobile") {
    return (
      <div className={`flex flex-col space-y-2 py-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">
          <Globe className="w-4 h-4 text-brand-600" aria-hidden="true" />
          <span>{t("common.selectLanguage")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("common.selectLanguage")}>
          {SUPPORTED_LOCALES.map((code) => {
            const item = LOCALE_REGISTRY[code];
            const isSelected = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                role="radio"
                aria-checked={isSelected}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  isSelected
                    ? "bg-brand-50 border-brand-300 text-brand-900 font-bold"
                    : "bg-surface-50 border-surface-200 text-surface-700 hover:bg-surface-100"
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{item.flag}</span>
                  <span className="truncate">{item.nativeName}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t("common.selectLanguage")}: ${metadata.nativeName}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
      >
        <Globe className="w-3.5 h-3.5 text-surface-500" aria-hidden="true" />
        <span className="text-sm leading-none" aria-hidden="true">
          {metadata.flag}
        </span>
        <span className="hidden sm:inline font-medium text-xs text-surface-800">
          {metadata.nativeName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-surface-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("common.selectLanguage")}
          className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-surface-200/90 py-1.5 z-50 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-surface-400 border-b border-surface-100">
            {t("common.selectLanguage")}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {SUPPORTED_LOCALES.map((code) => {
              const item = LOCALE_REGISTRY[code];
              const isSelected = locale === code;
              return (
                <button
                  key={code}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-brand-50 text-brand-900 font-semibold"
                      : "text-surface-700 hover:bg-surface-50 hover:text-surface-900"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-sm leading-none" aria-hidden="true">
                      {item.flag}
                    </span>
                    <span className="truncate">{item.nativeName}</span>
                    {item.status === "full" && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">
                        100%
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
