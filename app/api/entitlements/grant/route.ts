import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authStore, entitlementStore } from "@/lib/store";
import { isStubMode } from "@/lib/env";
import type { EntitlementPlan } from "@/lib/store/entitlements";

export async function POST(req: Request) {
  if (!isStubMode()) return NextResponse.json({ error: "stub_only" }, { status: 403 });
  const sessionId = cookies().get("sessionId")?.value;
  const session = await Promise.resolve(authStore.getSession(sessionId));
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { plan = "registration", source = "stub" } = (await req.json().catch(() => ({}))) as {
    plan?: EntitlementPlan;
    source?: string;
  };
  const entitlement = await Promise.resolve(
    entitlementStore.grantEntitlement(session.userId, plan, source, { stub: true }),
  );
  return NextResponse.json({ entitlement });
}
