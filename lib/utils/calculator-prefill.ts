import { useState, useEffect, useCallback } from "react";
import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { UserProfile, TaxProfile } from "@/types/supabase";
import { fetchUserProfile, updateUserProfile } from "./user-profile-api";

export interface CalculatorPrefillState {
  isLoading: boolean;
  isPrefilled: boolean;
  profile: UserProfile | null;
  taxProfile: TaxProfile | null;
  error: string | null;
}

export interface UseCalculatorPrefillResult {
  isLoading: boolean;
  isPrefilled: boolean;
  profile: UserProfile | null;
  taxProfile: TaxProfile | null;
  isSavingDefault: boolean;
  saveDefaultSuccess: string | null;
  saveDefaultError: string | null;
  saveAsDefault: (year: TaxYear, status: TaxFilingStatus) => Promise<boolean>;
  clearSaveStatus: () => void;
}

/**
 * Reusable hook connecting calculator forms to the authenticated taxpayer's profile defaults.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Prefill ONLY: Never automatically submits or calculates taxes.
 * 2. User Override Authority: Form values can always be changed freely without mutating profile.
 * 3. Explicit Save Action: Profile is updated ONLY when the user explicitly triggers saveAsDefault.
 * 4. Graceful Degradation: If unauthenticated or API fails, form operates normally with standard defaults.
 */
export function useCalculatorPrefill(
  onPrefillLoaded?: (defaults: { taxYear: TaxYear; filingStatus: TaxFilingStatus; taxProfile: TaxProfile }) => void
): UseCalculatorPrefillResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrefilled, setIsPrefilled] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);

  const [isSavingDefault, setIsSavingDefault] = useState<boolean>(false);
  const [saveDefaultSuccess, setSaveDefaultSuccess] = useState<string | null>(null);
  const [saveDefaultError, setSaveDefaultError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDefaults() {
      // Check if user is reopening a saved calculation from session storage first
      if (typeof window !== "undefined") {
        const stored = window.sessionStorage.getItem("taxaihelp_reopen_calculation");
        if (stored) {
          if (isMounted) setIsLoading(false);
          return;
        }
      }

      try {
        const res = await fetchUserProfile();
        if (!isMounted) return;

        if (res.success && res.data) {
          const { profile: p, taxProfile: tp } = res.data;
          setProfile(p);
          setTaxProfile(tp);
          setIsPrefilled(true);

          if (onPrefillLoaded && tp) {
            onPrefillLoaded({
              taxYear: tp.defaultTaxYear,
              filingStatus: tp.filingStatus,
              taxProfile: tp,
            });
          }
        }
      } catch (_err) {
        // Fallback silently without breaking calculator functionality
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDefaults();

    return () => {
      isMounted = false;
    };
  }, [onPrefillLoaded]);

  const saveAsDefault = useCallback(
    async (year: TaxYear, status: TaxFilingStatus): Promise<boolean> => {
      setIsSavingDefault(true);
      setSaveDefaultSuccess(null);
      setSaveDefaultError(null);

      try {
        const res = await updateUserProfile({
          taxProfile: {
            defaultTaxYear: year,
            filingStatus: status,
          },
        });

        setIsSavingDefault(false);

        if (res.success && res.data) {
          setTaxProfile(res.data.taxProfile);
          setSaveDefaultSuccess(`Saved Tax Year ${year} (${status.replace(/_/g, " ")}) as your new account default.`);
          setTimeout(() => setSaveDefaultSuccess(null), 4000);
          return true;
        } else {
          setSaveDefaultError(res.error || "Failed to update default preferences.");
          setTimeout(() => setSaveDefaultError(null), 4000);
          return false;
        }
      } catch (_err) {
        setIsSavingDefault(false);
        setSaveDefaultError("Network error occurred while saving default preferences.");
        setTimeout(() => setSaveDefaultError(null), 4000);
        return false;
      }
    },
    []
  );

  const clearSaveStatus = useCallback(() => {
    setSaveDefaultSuccess(null);
    setSaveDefaultError(null);
  }, []);

  return {
    isLoading,
    isPrefilled,
    profile,
    taxProfile,
    isSavingDefault,
    saveDefaultSuccess,
    saveDefaultError,
    saveAsDefault,
    clearSaveStatus,
  };
}
