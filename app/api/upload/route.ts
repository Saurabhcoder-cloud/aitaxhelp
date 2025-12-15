import { NextResponse } from "next/server";
import { saveUpload } from "@/lib/store/uploads";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const language = formData.get("language") as string | undefined;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const sizeLimit = 10 * 1024 * 1024;
  if (file.size > sizeLimit) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  saveUpload({
    id,
    filename: file.name,
    size: file.size,
    type: file.type,
    language,
    uploadedAt: new Date().toISOString(),
  });

  return NextResponse.json({ upload_id: id });
}
