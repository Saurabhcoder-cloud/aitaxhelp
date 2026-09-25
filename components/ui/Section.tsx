import React from "react";
import { cn } from "../../lib/utils/cn";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg" | "xl";
  background?: "white" | "muted" | "dark" | "navy";
}

export function Section({
  className,
  spacing = "lg",
  background = "white",
  children,
  ...props
}: SectionProps) {
  const spacingStyles = {
    sm: "py-8 md:py-12",
    md: "py-12 md:py-16",
    lg: "py-16 md:py-24",
    xl: "py-20 md:py-32",
  };

  const bgStyles = {
    white: "bg-white",
    muted: "bg-surface-50 border-y border-surface-200",
    dark: "bg-surface-900 text-white",
    navy: "bg-navy-900 text-white border-y border-navy-800",
  };

  return (
    <section
      className={cn(spacingStyles[spacing], bgStyles[background], className)}
      {...props}
    >
      {children}
    </section>
  );
}
