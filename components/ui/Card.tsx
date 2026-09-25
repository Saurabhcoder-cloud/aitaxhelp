import React from "react";
import { cn } from "../../lib/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "interactive" | "elevated";
}

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-white border border-surface-200 rounded-xl shadow-subtle",
    bordered: "bg-white border-2 border-surface-200 rounded-xl",
    interactive:
      "bg-white border border-surface-200 rounded-xl shadow-subtle hover:shadow-card hover:border-brand-300 transition-all duration-200 cursor-pointer",
    elevated: "bg-white border border-surface-100 rounded-xl shadow-card",
  };

  return (
    <div className={cn(variantStyles[variant], "p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex flex-col space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-surface-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-surface-700", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-surface-800", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex items-center pt-4 border-t border-surface-100", className)} {...props}>
      {children}
    </div>
  );
}
