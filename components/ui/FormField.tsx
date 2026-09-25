import React from "react";
import { cn } from "../../lib/utils/cn";

export interface FormFieldProps {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  id,
  error,
  hint,
  required = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 w-full", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-surface-800 flex items-center gap-1 select-none"
        >
          {label}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      </div>

      {children}

      {error ? (
        <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-surface-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
