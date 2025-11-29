import { NextResponse } from 'next/server';
import { ensureDailyNews } from '@/lib/taxNewsService';

export async function GET() {
  const news = ensureDailyNews();
  const sorted = news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json({ news: sorted });
}
