import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function SecuritySection() {
  const t = useTranslations("security");
  const items = t.raw("items") as { title: string; body: string }[];
  return (
    <section id="security" className="border-b border-border py-16">
      <div className="container space-y-6">
        <div className="space-y-2">
          <h2 className="section-title">{t("title")}</h2>
          <p className="section-subtitle">{t("intro")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground whitespace-pre-line">
                {item.body}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
