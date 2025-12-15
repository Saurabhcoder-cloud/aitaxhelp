import { NextResponse } from "next/server";

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
