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
            <p className="font-semibold">Workflow</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>Language detect/selection</li>
              <li>Upload tax document (PDF/JPG/PNG, &lt;=10MB)</li>
              <li>OCR + document classifier (stubbed)</li>
              <li>Data extraction + validation (stub)</li>
              <li>Adaptive Q&amp;A in user language (UI stub)</li>
              <li>Tax &amp; benefits engine (stub calculation)</li>
              <li>Draft return builder (stub)</li>
              <li>Refund &amp; benefits summary</li>
              <li>Export / review / e-file handoff</li>
            </ul>
          </div>
        </div>
        <div className="grid gap-4 rounded-xl border border-border bg-white/80 p-6 shadow-sm">
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">Secure Upload</p>
            <p className="text-muted-foreground">Drag &amp; drop PDFs, JPGs, or PNGs. Client-side checks prevent oversized or unsupported files.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="font-semibold">Multilingual</p>
              <p className="text-muted-foreground">10 languages with translation-ready UI.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="font-semibold">IRS Ready</p>
              <p className="text-muted-foreground">Security, encryption, and privacy-first defaults.</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm">
            <p className="font-semibold">Start Filing in Minutes</p>
            <p className="text-muted-foreground">Guided steps from upload to export and e-file handoff.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
