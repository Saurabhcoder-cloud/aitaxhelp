import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function FeaturesSection() {
  const t = useTranslations("features");
  const items = t.raw("items") as { title: string; body: string }[];
  return (
    <section id="features" className="border-b border-border py-16">
      <div className="container space-y-6">
        <h2 className="section-title">{t("title")}</h2>
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
