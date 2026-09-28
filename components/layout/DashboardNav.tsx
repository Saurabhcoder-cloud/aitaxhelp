"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../../lib/utils/cn";
import { signOut, checkSession, getSessionToken } from "@/lib/utils/auth-client";
import { LogOut, User, Sparkles, Calculator, LayoutDashboard, Shield, CreditCard, Bell, LifeBuoy } from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    checkSession().then((session) => {
      if (session?.role === "admin") {
        setIsAdmin(true);
      }
    });

    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch("/api/v1/notifications?limit=1", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && typeof data.data?.unreadCount === "number") {
          setUnreadCount(data.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const links = [
    { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { title: "Saved Calculations", href: "/dashboard/calculations", icon: Calculator },
    { title: "AI Conversations", href: "/dashboard/conversations", icon: Sparkles },
    { title: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: unreadCount },
    { title: "Support", href: "/dashboard/support", icon: LifeBuoy },
    { title: "Billing & Plans", href: "/dashboard/billing", icon: CreditCard },
    { title: "Account & Settings", href: "/dashboard/settings", icon: User },
  ];


  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.push("/login?loggedOut=true");
    router.refresh();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-200 pb-2 gap-2">
      <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1" aria-label="Dashboard Navigation">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                  : "text-surface-600 hover:text-surface-900 hover:bg-surface-100"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-brand-600" : "text-surface-400")} />
              <span>{link.title}</span>
              {typeof link.badge === "number" && link.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Privileged Admin Portal Link: Visible ONLY to verified administrators */}
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-colors bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Portal</span>
          </Link>
        )}
      </nav>

      {/* Quick Sign Out Action */}
      <div className="flex items-center self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Sign out of your session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>
    </div>
  );
}

