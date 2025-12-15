import { NextResponse } from "next/server";
import { isStubMode } from "@/lib/env";
import { getSessionFromCookies } from "@/lib/auth/session";
import { uploadStore } from "@/lib/store";
import { getS3Adapter } from "@/lib/adapters/aws/s3";
import path from "path";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const safeName = (filename: string) => {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 80) || "upload.pdf";
};

export async function POST(req: Request) {
  if (isStubMode()) {
    return NextResponse.json({ error: "stub_only" }, { status: 400 });
  }
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { filename, mime, size, taxYear } = await req.json();
  if (!filename || !mime || typeof size !== "number") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(mime)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 415 });
  }
  if (size > MAX_SIZE) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  const cleanedName = safeName(filename);
  const record = await uploadStore.createUpload({
    userId: session.userId,
    filename: cleanedName,
    mime,
    size,
    year: taxYear,
    status: "initialized",
  });
  const storageKey = `uploads/${session.userId}/${record.id}/${cleanedName}`;
  await uploadStore.updateUploadMeta?.(record.id, { storageKey });
  const s3 = await getS3Adapter();
  const presigned = await s3.presignPut(storageKey, mime);
  return NextResponse.json({
    uploadId: record.id,
    storageKey,
    presignedUrl: presigned.url,
    requiredHeaders: presigned.headers ?? { "Content-Type": mime },
  });
}
