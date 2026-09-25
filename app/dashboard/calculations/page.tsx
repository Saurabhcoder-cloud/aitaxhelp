import React from "react";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function DashboardCalculationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Saved Calculations</h2>
          <p className="text-xs text-surface-500">
            Access your saved federal tax estimates and calculation snapshots.
          </p>
        </div>
      </div>

      <EmptyState
        title="No Saved Calculations Yet"
        description="Run any of our federal tax calculators to generate and save your deterministic estimation results."
        actionLabel="Browse Calculators"
        actionHref="/tax-calculators"
      />
    </div>
  );
}
