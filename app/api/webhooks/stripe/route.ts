import { NextResponse } from "next/server";
import { isStubMode, requiredEnv } from "@/lib/env";

export async function POST() {
  if (isStubMode()) return NextResponse.json({ error: "stub_mode" }, { status: 400 });
  try {
    requiredEnv("STRIPE_WEBHOOK_SECRET");
  } catch (error) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
}
