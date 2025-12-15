import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/store/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "missing" }, { status: 400 });
  const session = verifyOtpCode(email, code);
  if (!session) return NextResponse.json({ error: "invalid" }, { status: 400 });
  cookies().set("sessionId", session.id, { httpOnly: true, sameSite: "lax" });
  return NextResponse.json({ ok: true });
}
