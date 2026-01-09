import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function FooterCTA() {
  const t = useTranslations("cta");
  return (
    <footer id="cta" className="border-t border-border bg-muted/40">
      <div className="container grid gap-4 py-10 text-center sm:grid-cols-2 sm:text-left">
        <div>
          <h2 className="section-title">{t("title")}</h2>
          <p className="section-subtitle mt-2">{t("subtitle")}</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end">
          <Link href="/start">
            <Button size="lg">{t("button")}</Button>
          </Link>
        </div>
      </div>
    </footer>
  );
}
