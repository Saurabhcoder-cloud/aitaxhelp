import { env } from "@/lib/env";

export interface SesAdapter {
  sendOtp(email: string, code: string): Promise<void>;
}

const buildStub = (): SesAdapter => ({
  async sendOtp() {
    return;
  },
});

const buildReal = async (): Promise<SesAdapter> => {
  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const client = new SESClient({ region: env.AWS_REGION });
  return {
    async sendOtp(email: string, code: string) {
      await client.send(
        new SendEmailCommand({
          Destination: { ToAddresses: [email] },
          Source: env.SES_FROM_EMAIL,
          Message: {
            Subject: { Data: "Your TaxHelp AI login code" },
            Body: { Text: { Data: `Your one-time code is ${code}. It expires in 10 minutes.` } },
          },
        }),
      );
    },
  };
};

export const getSesAdapter = async (): Promise<SesAdapter> => {
  if (env.STUB_MODE) return buildStub();
  return buildReal();
};
