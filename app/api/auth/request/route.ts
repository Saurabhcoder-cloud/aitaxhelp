import { NextResponse } from "next/server";
import { isStubMode } from "@/lib/env";
import { authStore } from "@/lib/store";
import { getSesAdapter } from "@/lib/adapters/aws/ses";
import { hashToken } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (isStubMode()) {
    const user = authStore.createUser(email);
    const otp = authStore.createOtp(user.id);
    return NextResponse.json({ ok: true, code: otp.code });
  }

  const normalizedEmail = email.toLowerCase();
  const now = Date.now();
  const recent = authStore.findRecentOtps
    ? await authStore.findRecentOtps(normalizedEmail, new Date(now - 2 * 60 * 1000))
    : [];
  if (recent.length >= 3) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const user = await authStore.ensureUser(normalizedEmail);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now + 10 * 60 * 1000);
  await authStore.upsertOtp?.(normalizedEmail, hashToken(code), expiresAt);
  const ses = await getSesAdapter();
  await ses.sendOtp(normalizedEmail, code);
  logger.info("otp_requested", { email: logger.redact(normalizedEmail) });
  return NextResponse.json({ ok: true });
}
