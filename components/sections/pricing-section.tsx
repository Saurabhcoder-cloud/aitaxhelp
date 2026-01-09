import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function PricingSection() {
  const t = useTranslations("pricing");
  const plans = t.raw("plans") as { name: string; badge?: string; features: string[]; cta: string }[];
  return (
    <section id="pricing" className="border-b border-border py-16">
      <div className="container space-y-8">
        <h2 className="section-title">{t("title")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className="h-full">
              <CardHeader className="space-y-2">
                {plan.badge && (
                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {plan.badge}
                  </span>
                )}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((item) => (
                    <li key={item}>✔ {item}</li>
                  ))}
                </ul>
                <Button className="w-full">{plan.cta}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
