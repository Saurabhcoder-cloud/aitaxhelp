import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function FormsSection() {
  const t = useTranslations("forms");
  const groups = t.raw("groups") as { title: string; items: string[] }[];
  return (
    <section id="forms" className="border-b border-border py-16">
      <div className="container space-y-6">
        <div className="space-y-2">
          <h2 className="section-title">{t("title")}</h2>
          <p className="section-subtitle">{t("intro")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.title} className="h-full">
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-muted-foreground">
                  {group.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
