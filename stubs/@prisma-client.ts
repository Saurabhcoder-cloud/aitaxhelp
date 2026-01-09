export class PrismaClient {
  constructor(_opts?: any) {}
  user = {} as any;
  session = {} as any;
  otpToken = {} as any;
  entitlement = {} as any;
  upload = {} as any;
  auditEvent = {} as any;
  consent = {} as any;
  job = {} as any;
  async $disconnect() {
    return Promise.resolve();
  }
}
