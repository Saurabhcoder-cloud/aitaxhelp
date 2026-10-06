"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { MAIN_NAV_ITEMS } from "../../lib/constants/navigation";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { MobileNav } from "./MobileNav";
import { checkSession, signOut, ClientUserSession } from "../../lib/utils/auth-client";
import { LogOut, User } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { LanguageSelector } from "../shared/LanguageSelector";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [session, setSession] = useState<ClientUserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuth() {
      try {
        const user = await checkSession();
        if (isMounted) {
          setSession(user);
          setIsAuthLoading(false);
        }
      } catch (_err) {
        if (isMounted) {
          setSession(null);
          setIsAuthLoading(false);
        }
      }
    }

    loadAuth();

    const handleAuthEvent = () => {
      loadAuth();
    };

    window.addEventListener("taxaihelp-auth-change", handleAuthEvent);
    window.addEventListener("storage", handleAuthEvent);

    return () => {
      isMounted = false;
      window.removeEventListener("taxaihelp-auth-change", handleAuthEvent);
      window.removeEventListener("storage", handleAuthEvent);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    router.push("/");
    router.refresh();
  };

  const isAuthenticated = Boolean(!isAuthLoading && session && session.id);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 xl:gap-8 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-navy-900 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-surface-900 leading-tight whitespace-nowrap">
                TaxAI<span className="text-brand-600">Help</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-600 hidden sm:inline whitespace-nowrap">
                {t("common.usTaxIntelligence")}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1" aria-label="Main Navigation">
            {MAIN_NAV_ITEMS.map((item) => (
              <div
                key={item.title}
                className="relative"
                onMouseEnter={() => item.children && setActiveDropdown(item.title)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-medium text-surface-700 hover:text-surface-900 hover:bg-surface-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="brand" size="sm" className="whitespace-nowrap text-[10px] py-0 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                  {item.children && (
                    <svg
                      className="w-3.5 h-3.5 text-surface-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.children && activeDropdown === item.title && (
                  <div className="absolute top-full left-0 w-72 bg-white rounded-xl shadow-lg border border-surface-200 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {item.children.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href}
                        className="block p-2.5 rounded-lg hover:bg-surface-50 transition-colors"
                      >
                        <div className="text-sm font-semibold text-surface-900">
                          {child.title}
                        </div>
                        {child.description && (
                          <div className="text-xs text-surface-600 mt-0.5 line-clamp-1">
                            {child.description}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right CTA Area */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <LanguageSelector variant="header" />

          {isAuthenticated ? (
            /* Authenticated Navigation Items */
            <>
              <Link
                href="/dashboard"
                className={`hidden md:inline-flex items-center gap-1.5 text-xs xl:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                    ? "text-brand-600 bg-brand-50"
                    : "text-surface-700 hover:text-brand-600 hover:bg-surface-50"
                }`}
              >
                <User className="w-3.5 h-3.5 text-surface-400" />
                <span>{t("nav.dashboard")}</span>
              </Link>

              <Button
                href="/dashboard/taxes"
                size="sm"
                className="hidden sm:inline-flex shadow-sm whitespace-nowrap font-medium"
              >
                {t("nav.calculateYourTaxes")}
              </Button>

              <button
                type="button"
                onClick={handleSignOut}
                className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-surface-500 hover:text-surface-900 px-2 py-1.5 rounded-lg hover:bg-surface-100 transition-colors whitespace-nowrap cursor-pointer"
                title={t("nav.signOut")}
                aria-label={t("nav.signOut")}
              >
                <LogOut className="w-3.5 h-3.5 text-surface-400" />
                <span>{t("nav.signOut")}</span>
              </button>
            </>
          ) : (
            /* Unauthenticated Navigation Items (also rendered during SSR/hydration to prevent flash) */
            <>
              <Link
                href="/login"
                className={`hidden sm:inline-flex items-center text-xs xl:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  pathname === "/login"
                    ? "text-brand-600 bg-brand-50"
                    : "text-surface-700 hover:text-brand-600 hover:bg-surface-50"
                }`}
              >
                {t("nav.signIn")}
              </Link>

              <Button
                href="/login?next=/dashboard/taxes"
                size="sm"
                className="hidden sm:inline-flex shadow-sm whitespace-nowrap font-medium"
              >
                {t("nav.calculateYourTaxes")}
              </Button>
            </>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 hover:text-surface-900 focus:outline-none"
            aria-label="Open navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        session={session}
        onSignOut={handleSignOut}
      />
    </header>
  );
}
