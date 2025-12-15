import { getPrisma } from "./db-client";

export const dbAuthStore = {
  async getUserByEmail(email: string) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { email } });
  },
  async ensureUser(email: string) {
    const prisma = await getPrisma();
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  },
  async createOtp(email: string, tokenHash: string, expiresAt: Date) {
    const prisma = await getPrisma();
    return prisma.otpToken.create({ data: { email, tokenHash, expiresAt } });
  },
  async upsertOtp(email: string, tokenHash: string, expiresAt: Date) {
    const prisma = await getPrisma();
    return prisma.otpToken.upsert({
      where: { email },
      update: { tokenHash, expiresAt, attempts: 0, createdAt: new Date() },
      create: { email, tokenHash, expiresAt },
    });
  },
  async findOtp(email: string) {
    const prisma = await getPrisma();
    return prisma.otpToken.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  },
  async findRecentOtps(email: string, since: Date) {
    const prisma = await getPrisma();
    return prisma.otpToken.findMany({ where: { email, createdAt: { gte: since } } });
  },
  async getUserById(id: string) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { id } });
  },
  async incrementOtpAttempts(id: string) {
    const prisma = await getPrisma();
    return prisma.otpToken.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },
  async deleteOtp(id: string) {
    const prisma = await getPrisma();
    return prisma.otpToken.delete({ where: { id } });
  },
  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    const prisma = await getPrisma();
    return prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  },
  async findSession(tokenHash: string) {
    const prisma = await getPrisma();
    return prisma.session.findFirst({ where: { tokenHash } });
  },
  async findSessionById(id: string) {
    const prisma = await getPrisma();
    return prisma.session.findUnique({ where: { id } });
  },
  async getSession(id: string) {
    const prisma = await getPrisma();
    return prisma.session.findUnique({ where: { id } });
  },
  async deleteSession(id: string) {
    const prisma = await getPrisma();
    return prisma.session.delete({ where: { id } });
  },
};

