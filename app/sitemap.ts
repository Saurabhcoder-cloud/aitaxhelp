import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://taxhelp.ai";
  const routes = ["", "/pricing", "/security", "/faq", "/start", "/upload", "/processing", "/review", "/export"];
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: "weekly", priority: 0.8 }));
}
