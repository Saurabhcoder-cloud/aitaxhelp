import { getPrisma } from "./db-client";

export const dbJobStore = {
  async enqueue(uploadId: string | null, type: string, runAt: Date, metaJson?: Record<string, any>) {
    const prisma = await getPrisma();
    return prisma.job.create({ data: { uploadId: uploadId || undefined, type, status: "pending", runAt, metaJson } });
  },
  async nextDue() {
    const prisma = await getPrisma();
    return prisma.job.findFirst({ where: { status: "pending", runAt: { lte: new Date() } }, orderBy: { runAt: "asc" } });
  },
  async markRunning(id: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "running", attempts: { increment: 1 } } });
  },
  async markDone(id: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "completed", lastError: null } });
  },
  async markError(id: string, error: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "failed", lastError: error } });
  },
};

