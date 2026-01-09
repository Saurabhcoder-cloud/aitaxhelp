import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function WhySection() {
  const t = useTranslations("why");
  const items = t.raw("items") as { title: string; body: string }[];
  return (
    <section id="why" className="border-b border-border py-16">
      <div className="container space-y-8">
        <div className="space-y-3">
          <h2 className="section-title">{t("title")}</h2>
          <p className="section-subtitle whitespace-pre-line">{t("subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
