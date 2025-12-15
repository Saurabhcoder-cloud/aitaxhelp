import { getPrisma } from "./db-client";

export const dbEntitlementStore = {
  async getEntitlement(userId: string) {
    const prisma = await getPrisma();
    return prisma.entitlement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  },
  async grantEntitlement(userId: string, plan: string, source: string, metadata?: Record<string, any>) {
    const prisma = await getPrisma();
    return prisma.entitlement.create({
      data: {
        userId,
        plan,
        status: "active",
        source,
        stripeSessionId: metadata?.stripeSessionId,
        stripeCustomerId: metadata?.stripeCustomerId,
      },
    });
  },
  async revokeEntitlement(userId: string) {
    const prisma = await getPrisma();
    return prisma.entitlement.deleteMany({ where: { userId } });
  },
};

