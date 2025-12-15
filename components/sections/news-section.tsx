import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockedNews } from "@/lib/api/news";
import { useTranslations } from "next-intl";

export function NewsSection() {
  const t = useTranslations("news");
  return (
    <section id="news" className="border-b border-border py-16">
      <div className="container space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("title")}</h2>
            <p className="section-subtitle">{t("intro")}</p>
          </div>
          <Badge>{t("badge")}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockedNews.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.date}</p>
              </CardHeader>
              <CardContent className="text-muted-foreground">{item.summary}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
