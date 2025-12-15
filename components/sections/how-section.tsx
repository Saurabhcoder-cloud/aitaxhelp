import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function HowSection() {
  const t = useTranslations("how");
  const steps = t.raw("steps") as { title: string; body: string }[];
  return (
    <section id="how" className="border-b border-border py-16">
      <div className="container space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">{t("title")}</h2>
          <Link href="/start">
            <Button>{t("cta")}</Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="h-full">
              <CardHeader>
                <p className="text-sm font-semibold text-primary">Step {index + 1}</p>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{step.body}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
