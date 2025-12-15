import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStubMode } from "@/lib/env";
import { authStore } from "@/lib/store";
import { verifyOtpCode } from "@/lib/store/auth";
import { createSessionToken, hashToken } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (isStubMode()) {
    const session = verifyOtpCode(email, code);
    if (!session) return NextResponse.json({ error: "invalid" }, { status: 400 });
    cookies().set("sessionId", session.id, { httpOnly: true, sameSite: "lax" });
    return NextResponse.json({ ok: true });
  }

  const otp = await authStore.findOtp(email.toLowerCase());
  if (!otp) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (otp.expiresAt.getTime() < Date.now()) {
    await authStore.deleteOtp(otp.id);
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  if (otp.attempts >= 5) return NextResponse.json({ error: "locked" }, { status: 429 });
  const providedHash = hashToken(code.toString());
  if (providedHash !== otp.tokenHash) {
    await authStore.incrementOtpAttempts(otp.id);
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const user = await authStore.ensureUser(email.toLowerCase());
  const token = createSessionToken();
  await authStore.createSession(user.id, hashToken(token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  await authStore.deleteOtp(otp.id);
  cookies().set("sessionId", token, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 7 * 24 * 60 * 60 });
  logger.info("session_created", { email: logger.redact(user.email) });
  return NextResponse.json({ ok: true });
}
