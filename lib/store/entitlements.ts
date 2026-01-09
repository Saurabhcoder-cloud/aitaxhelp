import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type EntitlementPlan = "registration" | "individual" | "family";
export type EntitlementStatus = "pending" | "active" | "revoked";

export type EntitlementRecord = {
  id: string;
  userId: string;
  plan: EntitlementPlan;
  status: EntitlementStatus;
  source?: string;
  metadata?: Record<string, unknown>;
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
};

const dataDir = ".data";
const dataFile = join(dataDir, "entitlements.json");

type Store = {
  entitlements: EntitlementRecord[];
};

const ensureStore = (): Store => {
  if (!existsSync(dataDir)) mkdirSync(dataDir);
  if (!existsSync(dataFile)) {
    const initial: Store = { entitlements: [] };
    writeFileSync(dataFile, JSON.stringify(initial, null, 2));
  }
  const raw = readFileSync(dataFile, "utf-8");
  return JSON.parse(raw) as Store;
};

const saveStore = (data: Store) => {
  writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

export const getEntitlement = (userId: string) => {
  const data = ensureStore();
  const entitlements = data.entitlements
    .filter((e) => e.userId === userId && e.status === "active")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return entitlements[0];
};

export const grantEntitlement = (
  userId: string,
  plan: EntitlementPlan,
  source?: string,
  metadata?: Record<string, unknown>,
  stripeSessionId?: string,
) => {
  const data = ensureStore();
  const now = new Date().toISOString();
  const record: EntitlementRecord = {
    id: randomUUID(),
    userId,
    plan,
    status: "active",
    source,
    metadata,
    stripeSessionId,
    createdAt: now,
    updatedAt: now,
  };
  data.entitlements.unshift(record);
  saveStore(data);
  return record;
};

export const revokeEntitlement = (userId: string) => {
  const data = ensureStore();
  data.entitlements = data.entitlements.map((e) =>
    e.userId === userId && e.status === "active" ? { ...e, status: "revoked", updatedAt: new Date().toISOString() } : e,
  );
  saveStore(data);
};

export const activateEntitlementForSession = (stripeSessionId: string) => {
  const data = ensureStore();
  const match = data.entitlements.find((e) => e.stripeSessionId === stripeSessionId);
  if (match) {
    match.status = "active";
    match.updatedAt = new Date().toISOString();
    saveStore(data);
  }
  return match;
};
