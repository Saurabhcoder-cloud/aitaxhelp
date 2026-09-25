import React from "react";
import { cn } from "../../lib/utils/cn";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Calculating verified federal tax numbers...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-surface-200 border-t-brand-600 animate-spin" />
        <div className="absolute w-6 h-6 rounded-full bg-brand-50" />
      </div>
      <p className="mt-4 text-sm font-medium text-surface-700 animate-pulse">
        {message}
      </p>
    </div>
  );
}
