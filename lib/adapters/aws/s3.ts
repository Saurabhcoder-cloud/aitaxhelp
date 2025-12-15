import { randomUUID } from "crypto";
import { env } from "@/lib/env";

export type PresignedUpload = {
  url: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
};

export interface S3Adapter {
  presignPut(key: string, contentType: string): Promise<PresignedUpload>;
  deleteObjects(keys: string[]): Promise<void>;
}

const buildStub = (): S3Adapter => ({
  async presignPut() {
    return { url: "https://example.com/stub-upload" };
  },
  async deleteObjects() {
    return;
  },
});

const buildReal = async (): Promise<S3Adapter> => {
  const s3Module = (await import("@aws-sdk/client-s3")) as any;
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const S3Client = s3Module.S3Client as typeof import("@aws-sdk/client-s3").S3Client;
  const PutObjectCommand = s3Module.PutObjectCommand as typeof import("@aws-sdk/client-s3").PutObjectCommand;
  const DeleteObjectsCommand = (s3Module as any).DeleteObjectsCommand as any;
  const client = new S3Client({ region: env.AWS_REGION, credentials: undefined });
  const presignPut = async (key: string, contentType: string) => {
    const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(client, command, { expiresIn: 600 });
    return { url, headers: { "Content-Type": contentType } };
  };
  const deleteObjects = async (keys: string[]) => {
    if (!keys.length) return;
    await client.send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  };
  return { presignPut, deleteObjects };
};

export const getS3Adapter = async (): Promise<S3Adapter> => {
  if (env.STUB_MODE) return buildStub();
  return buildReal();
};

export const buildStorageKey = (userId: string, filename: string) =>
  `uploads/${userId}/${randomUUID()}/${filename}`;
