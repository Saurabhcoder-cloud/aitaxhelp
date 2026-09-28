"use client";

import React from "react";
import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { TaxProfile } from "@/types/supabase";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, BookmarkCheck, Sparkles, AlertCircle } from "lucide-react";

interface CalculatorPrefillNoticeProps {
  taxProfile: TaxProfile | null;
  currentYear: TaxYear;
  currentStatus: TaxFilingStatus;
  isSaving: boolean;
  saveSuccess: string | null;
  saveError: string | null;
  onSaveAsDefault: () => void;
  className?: string;
}

export function CalculatorPrefillNotice({
  taxProfile,
  currentYear,
  currentStatus,
  isSaving,
  saveSuccess,
  saveError,
  onSaveAsDefault,
  className = "",
}: CalculatorPrefillNoticeProps) {
  if (!taxProfile) {
    return null;
  }

  const isMatchingDefault =
    taxProfile.defaultTaxYear === currentYear && taxProfile.filingStatus === currentStatus;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in duration-150">
          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccess}</span>
        </div>
      )}

      {/* Error banner */}
      {saveError && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="font-medium">{saveError}</span>
        </div>
      )}

      {/* Status indicator & explicit save action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
        {isMatchingDefault ? (
          <div className="flex items-center gap-1.5 text-surface-500">
            <Badge variant="brand" size="sm" className="gap-1 font-normal text-[11px]">
              <ShieldCheck className="w-3 h-3 text-brand-600" />
              Prefilled from your Profile
            </Badge>
            <span className="text-[11px] text-surface-400 hidden sm:inline">
              (Year {currentYear} • {currentStatus.replace(/_/g, " ")})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-surface-600">
            <Badge variant="neutral" size="sm" className="gap-1 font-normal text-[11px] bg-surface-100 text-surface-700">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Customized for this calculation
            </Badge>
          </div>
        )}

        {/* Explicit Save as Default Button when user modifies defaults */}
        {!isMatchingDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSaveAsDefault}
            disabled={isSaving}
            isLoading={isSaving}
            className="text-[11px] text-brand-700 hover:text-brand-900 hover:bg-brand-50 h-7 px-2 font-medium"
            title="Update your account default tax year and filing status to match these values"
          >
            Save as my account default
          </Button>
        )}
      </div>
    </div>
  );
}
