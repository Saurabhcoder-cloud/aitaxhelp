export interface NewsItem {
  date: string;
  title: string;
  summary: string;
}

export const mockedNews: NewsItem[] = [
  {
    date: "2024-12-01",
    title: "IRS updates standard mileage rates",
    summary: "Latest mileage deduction guidance for gig drivers and self-employed workers.",
  },
  {
    date: "2024-11-28",
    title: "State filing deadline adjustments",
    summary: "Several states announced deadline relief for disaster-impacted counties.",
  },
  {
    date: "2024-11-25",
    title: "Earned Income Credit table refreshed",
    summary: "Income thresholds updated for families and single filers for the new tax year.",
  },
  {
    date: "2024-11-20",
    title: "Marketplace health coverage reminders",
    summary: "Form 1095-A distribution timelines published for marketplace enrollees.",
  },
  {
    date: "2024-11-18",
    title: "IRS warns about new phishing trends",
    summary: "Security bulletin on avoiding scams targeting e-file credentials and refunds.",
  },
];

let cached: { at: number; items: NewsItem[] } | null = null;

export async function fetchNews(): Promise<NewsItem[]> {
  if (cached && Date.now() - cached.at < 1000 * 60 * 60 * 6) {
    return cached.items;
  }
  const { isStubMode } = await import("@/lib/env");
  if (isStubMode()) return mockedNews;

  try {
    const parser = await import("fast-xml-parser");
    const feeds = [
      "https://www.irs.gov/rss/irs-news",
      "https://www.taxadmin.org/feed", // multi-state tax admin association
    ];
    const fetches = await Promise.all(
      feeds.map(async (url) => {
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        const parsed = parser.XMLParser ? new parser.XMLParser().parse(text) : (parser as any).parse(text);
        const items =
          parsed?.rss?.channel?.item || parsed?.feed?.entry || parsed?.rss?.channel?.items || parsed?.channel?.item || [];
        return Array.isArray(items) ? items : [items];
      }),
    );
    const merged: NewsItem[] = fetches
      .flat()
      .filter(Boolean)
      .map((item: any) => ({
        date: item.pubDate || item.updated || item.date || new Date().toISOString(),
        title: item.title?.["#text"] || item.title || "Tax update",
        summary: item.description || item.summary || item["content:encoded"] || "",
      }))
      .slice(0, 8);
    cached = { at: Date.now(), items: merged.length ? merged : mockedNews };
    return cached.items;
  } catch (err) {
    console.error("news fetch failed", err);
    return mockedNews;
  }
}
