import React from "react";
import { cn } from "../../lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "brand" | "emerald" | "amber" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-surface-100 text-surface-800 border-surface-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    emerald: "bg-accent-50 text-accent-700 border-accent-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    outline: "bg-transparent text-surface-700 border-surface-300",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium tracking-wide select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
