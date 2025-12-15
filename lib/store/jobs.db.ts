import { getPrisma } from "./db-client";

export const dbJobStore = {
  async enqueue(uploadId: string | null, type: string, runAt: Date, metaJson?: Record<string, any>) {
    const prisma = await getPrisma();
    return prisma.job.create({ data: { uploadId: uploadId || undefined, type, status: "queued", runAt, metaJson } });
  },
  async nextDue(limit = 5) {
    const prisma = await getPrisma();
    return prisma.job.findMany({
      where: { status: "queued", runAt: { lte: new Date() } },
      orderBy: { runAt: "asc" },
      take: limit,
    });
  },
  async tryMarkRunning(id: string) {
    const prisma = await getPrisma();
    return prisma.job.updateMany({
      where: { id, status: "queued" },
      data: { status: "running", attempts: { increment: 1 }, updatedAt: new Date() },
    });
  },
  async markDone(id: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "completed", lastError: null, updatedAt: new Date() } });
  },
  async reschedule(id: string, runAt: Date, lastError?: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "queued", runAt, lastError, updatedAt: new Date() } });
  },
  async markError(id: string, error: string) {
    const prisma = await getPrisma();
    return prisma.job.update({ where: { id }, data: { status: "failed", lastError: error, updatedAt: new Date() } });
  },
  async getJob(id: string) {
    const prisma = await getPrisma();
    return prisma.job.findUnique({ where: { id } });
  },
};

