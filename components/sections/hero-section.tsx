import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("hero");
  return (
    <section id="hero" className="hero-gradient border-b border-border py-16 md:py-24">
      <div className="container grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold text-primary">TaxHelp AI</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
          <p className="text-base font-medium text-foreground">{t("detail")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/start">
              <Button size="lg">{t("ctaPrimary")}</Button>
            </Link>
            <Link href="/upload">
              <Button variant="secondary" size="lg">
                {t("ctaSecondary")}
              </Button>
            </Link>
          </div>
          <div className="rounded-lg border border-primary/20 bg-white/70 p-4 text-sm shadow-sm">
            <p className="font-semibold">{t("workflowTitle")}</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {(t.raw("workflowSteps") as string[]).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid gap-4 rounded-xl border border-border bg-white/80 p-6 shadow-sm">
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">{t("secureUploadTitle")}</p>
            <p className="text-muted-foreground">{t("secureUploadText")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="font-semibold">{t("multilingualTitle")}</p>
              <p className="text-muted-foreground">{t("multilingualText")}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="font-semibold">{t("irsReadyTitle")}</p>
              <p className="text-muted-foreground">{t("irsReadyText")}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm">
            <p className="font-semibold">{t("startBadgeTitle")}</p>
            <p className="text-muted-foreground">{t("startBadgeText")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
