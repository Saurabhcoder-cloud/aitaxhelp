"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils/cn";

export function DashboardNav() {
  const pathname = usePathname();

  const links = [
    { title: "Overview", href: "/dashboard" },
    { title: "Saved Calculations", href: "/dashboard/calculations" },
    { title: "AI Conversations", href: "/dashboard/conversations" },
    { title: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <nav className="flex space-x-2 border-b border-surface-200 pb-2 overflow-x-auto">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-surface-600 hover:text-surface-900 hover:bg-surface-50"
            )}
          >
            {link.title}
          </Link>
        );
      })}
    </nav>
  );
}
