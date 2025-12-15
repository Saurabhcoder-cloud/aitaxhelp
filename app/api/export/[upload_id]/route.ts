import { NextResponse } from "next/server";
import { getUpload, updateUploadStatus } from "@/lib/store/uploads";

export async function GET(
  _req: Request,
  { params, url }: { params: { upload_id: string }; url: string }
) {
  const { upload_id } = params;
  const search = new URL(url).searchParams;
  const type = search.get("type") ?? "pdf";
  const content = `Mock export for ${upload_id} as ${type.toUpperCase()}`;
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="taxhelp-${upload_id}.${type}"`,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { upload_id: string } }
) {
  const { upload_id } = params;
  const existing = getUpload(upload_id);

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { locale?: string } | null;
  const locale = body?.locale ?? "en";
  const timestamp = new Date().toISOString();

  const updated = updateUploadStatus(upload_id, {
    status: "consented",
    consent: { timestamp, locale },
  });

  return NextResponse.json({ ok: true, consent: updated?.consent, audit: updated?.audit });
}
