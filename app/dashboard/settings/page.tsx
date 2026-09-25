"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { FormField } from "../../../components/ui/FormField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";

export default function DashboardSettingsPage() {
  const [defaultYear, setDefaultYear] = useState("2025");
  const [defaultFilingStatus, setDefaultFilingStatus] = useState("single");
  const [hasW2, setHasW2] = useState(true);
  const [has1099, setHas1099] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-surface-900">Tax Profile Preferences</h2>
        <p className="text-xs text-surface-500">
          Set default parameters to pre-fill across all federal tax calculators.
        </p>
      </div>

      {saved && (
        <Alert variant="success" title="Preferences Saved">
          Your taxpayer profile preferences have been updated for this session.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Default Filing Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <FormField label="Default Tax Year" id="settingsYear">
              <Select
                id="settingsYear"
                value={defaultYear}
                onChange={(e) => setDefaultYear(e.target.value)}
                options={[
                  { label: "2026 (Rev. Proc. 2025-32)", value: "2026" },
                  { label: "2025 (IRS IRB 2025-45 / OBBBA)", value: "2025" },
                  { label: "2024 (Rev. Proc. 2023-34)", value: "2024" },
                  { label: "2023 (Rev. Proc. 2022-38)", value: "2023" },
                ]}
              />
            </FormField>

            <FormField label="Default Filing Status" id="settingsStatus">
              <Select
                id="settingsStatus"
                value={defaultFilingStatus}
                onChange={(e) => setDefaultFilingStatus(e.target.value)}
                options={[
                  { label: "Single", value: "single" },
                  { label: "Married Filing Jointly", value: "married_filing_jointly" },
                  { label: "Married Filing Separately", value: "married_filing_separately" },
                  { label: "Head of Household", value: "head_of_household" },
                ]}
              />
            </FormField>

            <div className="border-t border-surface-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-surface-900">Primary Income Sources</h4>

              <label className="flex items-center gap-3 text-sm text-surface-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasW2}
                  onChange={(e) => setHasW2(e.target.checked)}
                  className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>I earn W-2 wage or salary income from an employer</span>
              </label>

              <label className="flex items-center gap-3 text-sm text-surface-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={has1099}
                  onChange={(e) => setHas1099(e.target.checked)}
                  className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>I receive 1099-NEC / 1099-K independent contractor or freelance payments</span>
              </label>
            </div>

            <Button type="submit" size="md" className="mt-4">
              Save Preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
