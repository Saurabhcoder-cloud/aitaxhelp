import React from "react";
import { Container } from "../ui/Container";
import { Badge } from "../ui/Badge";
import { LegalDisclaimerNotice } from "../shared/LegalDisclaimerNotice";

interface CalculatorLayoutProps {
  title: string;
  badge?: string;
  description: string;
  children: React.ReactNode;
}

export function CalculatorLayout({
  title,
  badge = "Deterministic IRS Engine",
  description,
  children,
}: CalculatorLayoutProps) {
  return (
    <div className="py-10 bg-surface-50 min-h-[calc(100vh-4rem)]">
      <Container size="xl">
        {/* Header */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              {badge}
            </Badge>
            <span className="text-xs font-medium text-surface-600">
              Tax Years 2025 & 2026 Supported
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-700 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Content Body */}
        {children}

        {/* Educational Disclaimer */}
        <div className="mt-12 max-w-4xl">
          <LegalDisclaimerNotice />
        </div>
      </Container>
    </div>
  );
}
