import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { BreadcrumbItem, JsonLd, getBreadcrumbSchema } from "./JsonLd";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, showHome = true, className = "" }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ name: "Home", item: "/" }, ...items]
    : items;

  return (
    <>
      <JsonLd data={getBreadcrumbSchema(allItems)} />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-xs text-surface-500 overflow-x-auto whitespace-nowrap py-2 ${className}`}
      >
        <ol className="flex items-center space-x-1.5 sm:space-x-2">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            return (
              <li key={item.item} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 mx-1 text-surface-400 shrink-0" />
                )}
                {isLast ? (
                  <span
                    className="font-semibold text-surface-800"
                    aria-current="page"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.item}
                    className="flex items-center gap-1 hover:text-brand-600 transition-colors"
                  >
                    {index === 0 && showHome && <Home className="w-3.5 h-3.5 shrink-0" />}
                    <span>{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
