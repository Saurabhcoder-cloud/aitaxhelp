import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseDateParam(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language') || undefined;
  const jurisdiction = searchParams.get('jurisdiction') || undefined;
  const from = parseDateParam(searchParams.get('from'));
  const to = parseDateParam(searchParams.get('to'));
  const dateFilter = from || to ? { gte: from, lte: to } : undefined;

  const updates = await prisma.taxUpdate.findMany({
    where: {
      languageCode: language,
      jurisdiction,
      date: dateFilter
    },
    orderBy: {
      date: 'desc'
    }
  });

  return NextResponse.json({
    updates: updates.map((update) => ({
      id: update.id,
      date: update.date,
      jurisdiction: update.jurisdiction,
      title: update.title,
      summary: update.summary,
      sourceUrl: update.sourceUrl,
      impactType: update.impactType,
      languageCode: update.languageCode
    }))
  });
}
