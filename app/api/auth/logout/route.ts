import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authStore } from "@/lib/store";

export async function POST() {
  const sessionId = cookies().get("sessionId")?.value;
  if (sessionId) {
    await Promise.resolve(authStore.deleteSession(sessionId));
  }
  cookies().delete("sessionId");
  return NextResponse.json({ ok: true });
}
