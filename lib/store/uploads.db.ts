import { getPrisma } from "./db-client";

export const dbUploadStore = {
  async createUpload(data: { userId: string; filename: string; mime: string; size: number; status: string; storageKey?: string; year?: number }) {
    const prisma = await getPrisma();
    return prisma.upload.create({ data });
  },
  async getUpload(id: string) {
    const prisma = await getPrisma();
    return prisma.upload.findUnique({ where: { id }, include: { consent: true } });
  },
  async listUploads(userId: string, take = 5) {
    const prisma = await getPrisma();
    return prisma.upload.findMany({ where: { userId }, take, orderBy: { createdAt: "desc" } });
  },
  async updateUploadStatus(id: string, status: string) {
    const prisma = await getPrisma();
    return prisma.upload.update({ where: { id }, data: { status } });
  },
  async addAudit(uploadId: string, type: string, metaJson?: Record<string, any>) {
    const prisma = await getPrisma();
    return prisma.auditEvent.create({ data: { uploadId, type, ts: new Date(), metaJson } });
  },
  async storeConsent(uploadId: string, locale: string, ipHash?: string) {
    const prisma = await getPrisma();
    return prisma.consent.upsert({
      where: { uploadId },
      update: { ts: new Date(), locale, ipHash },
      create: { uploadId, ts: new Date(), locale, ipHash },
    });
  },
};

