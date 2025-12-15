import { env as loadedEnv } from "./config";

export const env = loadedEnv;
export const isStubMode = () => loadedEnv.STUB_MODE;

export const requiredEnv = (key: keyof typeof loadedEnv, fallback?: string) => {
  const value = (loadedEnv[key] as string | undefined) || fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${String(key)}`);
  }
  return value;
};
