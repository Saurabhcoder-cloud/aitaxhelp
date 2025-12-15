import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function CTAInline() {
  const t = useTranslations("cta");
  return (
    <section className="border-b border-border bg-primary/5 py-12">
      <div className="container flex flex-col items-start gap-4 rounded-xl border border-primary/10 bg-white/70 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/start">
          <Button size="lg">{t("button")}</Button>
        </Link>
      </div>
    </section>
  );
}
