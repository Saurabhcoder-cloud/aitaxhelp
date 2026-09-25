import React, { forwardRef } from "react";
import { cn } from "../../lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isCurrency?: boolean;
  hasError?: boolean;
  prefixText?: string;
  suffixText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      isCurrency = false,
      hasError = false,
      prefixText,
      suffixText,
      disabled,
      ...props
    },
    ref
  ) => {
    const showPrefix = isCurrency || prefixText;
    const prefix = isCurrency ? "$" : prefixText;

    return (
      <div className="relative flex items-center w-full">
        {showPrefix && (
          <span className="absolute left-3.5 text-surface-500 font-medium select-none pointer-events-none text-sm">
            {prefix}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full h-11 rounded-lg border bg-white px-3.5 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-surface-400",
            showPrefix ? "pl-8" : "pl-3.5",
            suffixText ? "pr-12" : "pr-3.5",
            hasError
              ? "border-red-500 focus:border-red-500 focus:ring-red-200"
              : "border-surface-300 hover:border-surface-400 focus:border-brand-500 focus:ring-brand-100",
            className
          )}
          {...props}
        />
        {suffixText && (
          <span className="absolute right-3.5 text-surface-500 text-xs select-none pointer-events-none">
            {suffixText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
