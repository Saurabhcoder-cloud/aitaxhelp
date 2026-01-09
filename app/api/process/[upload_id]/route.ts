import { NextResponse } from "next/server";
import { isStubMode } from "@/lib/env";
import { getUpload, updateUploadStatus } from "@/lib/store/uploads";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getPrisma } from "@/lib/store/db-client";

export async function POST(
  _req: Request,
  { params }: { params: { upload_id: string } },
) {
  const { upload_id } = params;
  if (isStubMode()) {
    const existing = getUpload(upload_id);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const nextProgress = Math.min(100, Math.max(existing.progress ?? 0, Math.floor(Math.random() * 35) * 3));
    const status = nextProgress >= 100 ? "processed" : "processing";
    const record = updateUploadStatus(upload_id, {
      progress: nextProgress,
      status,
    });
    return NextResponse.json({
      upload_id,
      progress: record?.progress ?? nextProgress,
      status: record?.status ?? status,
      steps: [
        { key: "ocr", status: (record?.progress ?? nextProgress) > 20 ? "done" : "pending" },
        { key: "classification", status: (record?.progress ?? nextProgress) > 50 ? "done" : "pending" },
        { key: "validation", status: (record?.progress ?? nextProgress) > 70 ? "done" : "pending" },
        { key: "drafting", status: (record?.progress ?? nextProgress) >= 100 ? "done" : "pending" },
      ],
      extracted: {
        filerName: "Jordan Lee",
        filingStatus: "Single",
        income: 52000,
        deductions: 8200,
      },
      audit: record?.audit,
    });
  }

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prisma = await getPrisma();
  const upload = await prisma.upload.findUnique({
    where: { id: upload_id },
    include: { audits: true, extracted: true },
  });
  if (!upload || upload.userId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const status = upload.status;
  const progressMap: Record<string, number> = {
    initialized: 10,
    uploaded: 20,
    processing: 60,
    processed: 100,
    failed: 0,
  };
  const progress = progressMap[status] ?? 0;
  const docTypes = upload.extracted ? [upload.extracted.docType] : [];
  const lastAudit = upload.audits.sort((a: any, b: any) => b.ts.getTime() - a.ts.getTime())[0];
  return NextResponse.json({
    upload_id,
    status,
    progress,
    steps: [
      { key: "ocr", status: progress > 20 ? "done" : "pending" },
      { key: "classification", status: progress > 40 ? "done" : "pending" },
      { key: "validation", status: progress > 60 ? "done" : "pending" },
      { key: "drafting", status: progress >= 100 ? "done" : "pending" },
    ],
    extracted: { docTypes },
    audit: lastAudit ? { last: lastAudit.ts } : undefined,
  });
}
