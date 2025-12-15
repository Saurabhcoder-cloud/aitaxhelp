"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleContext } from "./locale-provider";
import { useContext } from "react";
import { supportedLocales } from "@/lib/messages/locales";
import { Button } from "@/components/ui/button";

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const { locale, switchLocale } = useContext(LocaleContext);

  const navItems = [
    { label: t("nav.hero"), href: "#hero" },
    { label: t("nav.why"), href: "#why" },
    { label: t("nav.forms"), href: "#forms" },
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.how"), href: "#how" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.security"), href: "/security" },
    { label: t("nav.news"), href: "#news" },
    { label: t("nav.faq"), href: "/faq" }
  ];

  const isInternal = (href: string) => href.startsWith("#");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="text-lg font-semibold">
          TaxHelp AI
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={isInternal(item.href) && pathname !== "/" ? `/${item.href}` : item.href}
              className="text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <select
            aria-label="Language selector"
            className="hidden rounded-md border border-input bg-background px-2 py-1 text-sm md:block"
            value={locale}
            onChange={(e) => switchLocale(e.target.value as any)}
          >
            {supportedLocales.map((loc) => (
              <option key={loc} value={loc}>
                {loc.toUpperCase()}
              </option>
            ))}
          </select>
          <Link href="/start">
            <Button size="sm">{t("nav.cta")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
