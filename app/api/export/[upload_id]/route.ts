import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStubMode } from "@/lib/env";
import { uploadStore, authStore, entitlementStore } from "@/lib/store";

export async function GET(
  _req: Request,
  { params, url }: { params: { upload_id: string }; url: string }
) {
  const sessionId = cookies().get("sessionId")?.value;
  const session = await Promise.resolve(authStore.getSession(sessionId));
  if (!session && !isStubMode()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entitlement = session ? await Promise.resolve(entitlementStore.getEntitlement(session.userId)) : undefined;
  if (!entitlement && !isStubMode()) return NextResponse.json({ error: "payment_required" }, { status: 402 });

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
  const sessionId = cookies().get("sessionId")?.value;
  const session = await Promise.resolve(authStore.getSession(sessionId));
  if (!session && !isStubMode()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entitlement = session ? await Promise.resolve(entitlementStore.getEntitlement(session.userId)) : undefined;
  if (!entitlement && !isStubMode()) return NextResponse.json({ error: "payment_required" }, { status: 402 });

  const { upload_id } = params;
  const timestamp = new Date().toISOString();
  let existing = await Promise.resolve(uploadStore.getUpload(upload_id));

  if (!existing && isStubMode()) {
    existing = uploadStore.createUpload({
      id: upload_id,
      filename: "stub.pdf",
      size: 0,
      type: "application/pdf",
      uploadedAt: timestamp,
      language: "en",
    });
  }

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { locale?: string } | null;
  const locale = body?.locale ?? "en";

  const updated = await Promise.resolve(
    uploadStore.updateUploadStatus(upload_id, {
      status: "consented",
      consent: { timestamp, locale },
    }),
  );

  return NextResponse.json({ ok: true, consent: updated?.consent, audit: updated?.audit });
}
