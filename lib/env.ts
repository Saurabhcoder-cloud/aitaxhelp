export const isStubMode = () => process.env.STUB_MODE !== "false";

export const requiredEnv = (key: string, fallback?: string) => {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};
