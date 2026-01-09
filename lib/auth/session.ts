import { cookies as nextCookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { authStore } from "@/lib/store";
import { isStubMode } from "@/lib/env";

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function getSessionFromCookies(customCookies: any = nextCookies()) {
  const token = customCookies.get("sessionId")?.value;
  if (!token) return null;
  if (isStubMode()) {
    return authStore.getSession(token);
  }
  const hashed = hashToken(token);
  return authStore.findSession?.(hashed) || authStore.findSessionById?.(token);
}

export const createSessionToken = () => randomBytes(32).toString("hex");
