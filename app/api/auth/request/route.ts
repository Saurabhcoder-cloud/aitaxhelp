import { NextResponse } from "next/server";
import { createOtp, createUser } from "@/lib/store/auth";
import { isStubMode } from "@/lib/env";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const user = createUser(email);
  const otp = createOtp(user.id);
  if (isStubMode()) {
    return NextResponse.json({ ok: true, code: otp.code });
  }
  // TODO: integrate real email provider
  console.log(`OTP for ${email}: ${otp.code}`);
  return NextResponse.json({ ok: true });
}
