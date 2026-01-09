import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { join } from "path";

const dataDir = ".data";
const dataFile = join(dataDir, "auth.json");

export type User = { id: string; email: string; createdAt: string };
export type Session = { id: string; userId: string; createdAt: string };
export type Otp = { id: string; userId: string; code: string; expiresAt: number };
export type Entitlement = {
  id: string;
  userId: string;
  plan: string;
  status: "pending" | "active" | "failed";
  stripeSessionId?: string;
  createdAt: string;
};

type AuthData = {
  users: User[];
  sessions: Session[];
  otps: Otp[];
  entitlements: Entitlement[];
};

const ensureStore = (): AuthData => {
  if (!existsSync(dataDir)) mkdirSync(dataDir);
  if (!existsSync(dataFile)) {
    const initial: AuthData = { users: [], sessions: [], otps: [], entitlements: [] };
    writeFileSync(dataFile, JSON.stringify(initial, null, 2));
  }
  const raw = readFileSync(dataFile, "utf-8");
  return JSON.parse(raw) as AuthData;
};

const saveStore = (data: AuthData) => {
  writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

export const findUserByEmail = (email: string): User | undefined => {
  const data = ensureStore();
  return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
};

export const getUserById = (id: string): User | undefined => {
  const data = ensureStore();
  return data.users.find((u) => u.id === id);
};

export const createUser = (email: string): User => {
  const data = ensureStore();
  const existing = findUserByEmail(email);
  if (existing) return existing;
  const user: User = { id: randomUUID(), email, createdAt: new Date().toISOString() };
  data.users.push(user);
  saveStore(data);
  return user;
};

export const createOtp = (userId: string): Otp => {
  const data = ensureStore();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const otp: Otp = { id: randomUUID(), userId, code, expiresAt: Date.now() + 10 * 60 * 1000 };
  data.otps.push(otp);
  saveStore(data);
  return otp;
};

export const verifyOtpCode = (email: string, code: string): Session | null => {
  const data = ensureStore();
  const user = findUserByEmail(email);
  if (!user) return null;
  const otp = data.otps.find((o) => o.userId === user.id && o.code === code && o.expiresAt > Date.now());
  if (!otp) return null;
  data.otps = data.otps.filter((o) => o.id !== otp.id);
  const session: Session = { id: randomUUID(), userId: user.id, createdAt: new Date().toISOString() };
  data.sessions.push(session);
  saveStore(data);
  return session;
};

export const getSession = (id?: string): Session | undefined => {
  if (!id) return undefined;
  const data = ensureStore();
  return data.sessions.find((s) => s.id === id);
};

export const deleteSession = (id?: string) => {
  if (!id) return;
  const data = ensureStore();
  data.sessions = data.sessions.filter((s) => s.id !== id);
  saveStore(data);
};

export const createEntitlement = (
  userId: string,
  plan: string,
  status: Entitlement["status"],
  stripeSessionId?: string,
) => {
  const data = ensureStore();
  const ent: Entitlement = {
    id: randomUUID(),
    userId,
    plan,
    status,
    stripeSessionId,
    createdAt: new Date().toISOString(),
  };
  data.entitlements.push(ent);
  saveStore(data);
  return ent;
};

export const activateEntitlement = (stripeSessionId: string) => {
  const data = ensureStore();
  const ent = data.entitlements.find((e) => e.stripeSessionId === stripeSessionId);
  if (ent) {
    ent.status = "active";
    saveStore(data);
  }
  return ent;
};

export const listEntitlements = (userId: string) => {
  const data = ensureStore();
  return data.entitlements.filter((e) => e.userId === userId && e.status === "active");
};
