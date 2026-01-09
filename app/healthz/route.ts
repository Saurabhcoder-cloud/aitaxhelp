import { NextResponse } from "next/server";

export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || "dev";
  const build = process.env.VERCEL_ENV || "local";
  return NextResponse.json({ status: "ok", version, build });
}
