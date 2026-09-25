import React from "react";
import { cn } from "../../lib/utils/cn";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retryAction?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Calculation Error",
  message = "An error occurred while computing the calculation. Please check your inputs and try again.",
  retryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-200 bg-red-50/60",
        className
      )}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h4 className="text-base font-semibold text-red-900">{title}</h4>
      <p className="mt-1 text-sm text-red-700 max-w-md">{message}</p>
      {retryAction && (
        <div className="mt-4">
          <Button onClick={retryAction} variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
