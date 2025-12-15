import { NextResponse } from "next/server";
import { createUpload, getUpload, listUploads } from "@/lib/store/uploads";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const id = search.get("id");
  if (id) {
    const upload = getUpload(id);
    if (!upload) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ upload });
  }
  const uploads = listUploads(10);
  return NextResponse.json({ uploads });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const language = formData.get("language") as string | undefined;

  if (!file) {
    return NextResponse.json(
      { error: "file_required", message: "File is required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "invalid_type", message: "Only PDF, JPG, or PNG files are allowed." },
      { status: 415 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "file_too_large", message: "File exceeds the 10MB limit." },
      { status: 413 }
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  createUpload({
    id,
    filename: file.name,
    size: file.size,
    type: file.type,
    language,
    uploadedAt: now,
  });

  return NextResponse.json({ upload_id: id });
}
