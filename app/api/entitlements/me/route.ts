import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authStore, entitlementStore } from "@/lib/store";

export async function GET() {
  const sessionId = cookies().get("sessionId")?.value;
  const session = authStore.getSession(sessionId);
  if (!session) return NextResponse.json({ entitlement: null }, { status: 200 });
  const entitlement = entitlementStore.getEntitlement(session.userId) || null;
  return NextResponse.json({ entitlement });
}
