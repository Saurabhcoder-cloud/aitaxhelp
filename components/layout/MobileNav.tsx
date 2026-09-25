"use client";

import React from "react";
import Link from "next/link";
import { MAIN_NAV_ITEMS } from "../../lib/constants/navigation";
import { Button } from "../ui/Button";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  if (!isOpen) return null;

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
          </nav>
        </div>

        {/* Footer CTAs */}
        <div className="mt-8 pt-6 border-t border-surface-200 flex flex-col space-y-3">
          <Button href="/tax-calculators" onClick={onClose} size="md" className="w-full">
            Calculate Your Taxes
          </Button>
          <Button
            href="/ai-tax-assistant"
            onClick={onClose}
            variant="outline"
            size="md"
            className="w-full"
          >
            Ask AI Assistant
          </Button>
        </div>
      </div>
    </div>
  );
}
