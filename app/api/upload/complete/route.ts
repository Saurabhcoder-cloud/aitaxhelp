import { NextResponse } from "next/server";
import { isStubMode } from "@/lib/env";
import { getSessionFromCookies } from "@/lib/auth/session";
import { uploadStore, jobStore } from "@/lib/store";

export async function POST(req: Request) {
  if (isStubMode()) {
    return NextResponse.json({ error: "stub_only" }, { status: 400 });
  }
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uploadId } = await req.json();
  if (!uploadId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const upload = await uploadStore.getUpload(uploadId);
  if (!upload || upload.userId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await uploadStore.updateUploadStatus(uploadId, "uploaded");
  await uploadStore.addAudit(uploadId, "uploaded");
  await jobStore?.enqueue(uploadId, "process_upload", new Date(), {});
  return NextResponse.json({ ok: true });
}
