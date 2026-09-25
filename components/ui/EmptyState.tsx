import React from "react";
import { cn } from "../../lib/utils/cn";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-surface-300 bg-surface-50/50",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center text-surface-500 mb-4">
        {icon || (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-surface-900">{title}</h3>
      <p className="mt-1 text-sm text-surface-700 max-w-sm">{description}</p>
      {actionLabel && (
        <div className="mt-6">
          <Button href={actionHref} onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
