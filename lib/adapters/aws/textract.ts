import { env } from "@/lib/env";

export type TextractJob = { id: string };
export type TextractResult = { status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED"; blocks?: any[] };

export interface TextractAdapter {
  startJob(bucket: string, key: string): Promise<TextractJob>;
  getJob(jobId: string): Promise<TextractResult>;
}

const buildStub = (): TextractAdapter => ({
  async startJob() {
    return { id: "stub-job" };
  },
  async getJob() {
    return { status: "SUCCEEDED", blocks: [] };
  },
});

const buildReal = async (): Promise<TextractAdapter> => {
  const { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } = await import(
    "@aws-sdk/client-textract"
  );
  const client = new TextractClient({ region: env.AWS_REGION });
  return {
    async startJob(bucket: string, key: string) {
      const response = await client.send(
        new StartDocumentAnalysisCommand({
          FeatureTypes: ["TABLES", "FORMS"],
          DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
        }),
      );
      return { id: response.JobId || "" };
    },
    async getJob(jobId: string) {
      const response = await client.send(new GetDocumentAnalysisCommand({ JobId: jobId }));
      const status = (response.JobStatus as TextractResult["status"]) || "IN_PROGRESS";
      return { status, blocks: response.Blocks || [] };
    },
  };
};

export const getTextractAdapter = async (): Promise<TextractAdapter> => {
  if (env.STUB_MODE) return buildStub();
  return buildReal();
};
