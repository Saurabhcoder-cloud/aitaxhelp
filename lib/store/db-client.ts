import { appConfig, requireEnv } from "../config";

let prismaSingleton: any;

export const getPrisma = async () => {
  if (appConfig.stubMode) {
    throw new Error("Prisma client requested while STUB_MODE=true");
  }
  if (prismaSingleton) return prismaSingleton;
  const { PrismaClient } = await import("@prisma/client");
  prismaSingleton = new PrismaClient({
    datasources: {
      db: { url: requireEnv("DATABASE_URL") },
    },
  });
  return prismaSingleton;
};
