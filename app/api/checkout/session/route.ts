import { NextResponse } from "next/server";
import { isStubMode, requiredEnv } from "@/lib/env";
import type { EntitlementPlan } from "@/lib/store/entitlements";

export async function POST(req: Request) {
  if (isStubMode()) {
    return NextResponse.json({ error: "stub_mode" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    plan?: EntitlementPlan;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!body.plan) return NextResponse.json({ error: "missing_plan" }, { status: 400 });

  try {
    requiredEnv("STRIPE_SECRET_KEY");
  } catch (error) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
}
