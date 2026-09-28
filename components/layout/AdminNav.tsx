"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Calculator,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  Shield,
  Activity,
  Sliders,
  LifeBuoy,
  Database,
  Rocket,
  Radio,
  CheckCircle2,
} from "lucide-react";

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { title: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
    { title: "Launch Readiness", href: "/admin/launch-readiness", icon: CheckCircle2 },
    { title: "Operations", href: "/admin/operations", icon: Radio },
    { title: "Deployment", href: "/admin/deployment", icon: Rocket },
    { title: "Data Health", href: "/admin/data-health", icon: Database },
    { title: "Support", href: "/admin/support", icon: LifeBuoy },
    { title: "Configuration", href: "/admin/configuration", icon: Sliders },
    { title: "System Health", href: "/admin/system-health", icon: Activity },
    { title: "CPA/EA Leads", href: "/admin/leads", icon: UserCheck },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
    { title: "Calculations", href: "/admin/calculations", icon: Calculator },
    { title: "AI Analytics", href: "/admin/ai", icon: Sparkles },
    { title: "Reports", href: "/admin/reports", icon: FileSpreadsheet },
    { title: "Audit Log", href: "/admin/audit", icon: ShieldCheck },
  ];


  return (
    <div className="bg-surface-900 text-white border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2">
          {/* Admin Badge & Title */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-md text-xs font-semibold tracking-wider uppercase">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </div>
            <span className="text-xs text-surface-400 hidden md:inline">
              TaxAIHelp System Operations
            </span>
          </div>

          {/* Quick link back to User Dashboard */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-surface-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Taxpayer Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none" aria-label="Admin Navigation">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2",
                  isActive
                    ? "border-brand-500 text-white bg-surface-800/80 font-semibold"
                    : "border-transparent text-surface-400 hover:text-surface-200 hover:bg-surface-800/40"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-brand-400" : "text-surface-400")} />
                <span>{link.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
