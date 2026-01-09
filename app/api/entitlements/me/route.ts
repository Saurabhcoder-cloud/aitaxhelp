import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authStore, entitlementStore } from "@/lib/store";

export async function GET() {
  const sessionId = cookies().get("sessionId")?.value;
  const session = await Promise.resolve(authStore.getSession(sessionId));
  if (!session) return NextResponse.json({ entitlement: null }, { status: 200 });
  const entitlement = (await Promise.resolve(entitlementStore.getEntitlement(session.userId))) || null;
  return NextResponse.json({ entitlement });
}
