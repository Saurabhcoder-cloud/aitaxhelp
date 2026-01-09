import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/api/news";

export async function GET() {
  const items = await fetchNews();
  return NextResponse.json({ items });
}
