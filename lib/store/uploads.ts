import fs from "fs";
import path from "path";

export type UploadStatus = "uploaded" | "processing" | "processed" | "drafted" | "consented";

export interface UploadRecord {
  id: string;
  filename: string;
  size: number;
  type: string;
  language?: string;
  uploadedAt: string;
  status: UploadStatus;
  progress?: number;
  consent?: {
    timestamp: string;
    locale: string;
  };
  audit: {
    uploadedAt: string;
    processedAt?: string;
    draftedAt?: string;
    consentedAt?: string;
  };
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_PATH = path.join(DATA_DIR, "uploads.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, "[]", "utf8");
  }
}

function readStore(): UploadRecord[] {
  ensureStoreDir();
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw) as UploadRecord[];
  } catch (error) {
    console.error("Failed to read upload store", error);
    return [];
  }
}

function writeStore(records: UploadRecord[]) {
  ensureStoreDir();
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2), "utf8");
}

export function createUpload(meta: Omit<UploadRecord, "status" | "audit">) {
  const records = readStore();
  const record: UploadRecord = {
    ...meta,
    status: "uploaded",
    audit: { uploadedAt: meta.uploadedAt },
  };
  records.unshift(record);
  writeStore(records);
  return record;
}

export function getUpload(id: string) {
  const records = readStore();
  return records.find((item) => item.id === id);
}

export function listUploads(limit = 5) {
  const records = readStore();
  return records.slice(0, limit);
}

export function updateUploadStatus(id: string, update: Partial<UploadRecord>) {
  const records = readStore();
  const index = records.findIndex((item) => item.id === id);
  if (index === -1) return undefined;

  const existing = records[index];
  const audit = { ...existing.audit, ...(update.audit as Record<string, string> | undefined) };
  const status = update.status ?? existing.status;

  if (status === "processed" && !audit.processedAt) {
    audit.processedAt = new Date().toISOString();
  }
  if (status === "drafted" && !audit.draftedAt) {
    audit.draftedAt = new Date().toISOString();
  }
  if (update.consent && !audit.consentedAt) {
    audit.consentedAt = update.consent.timestamp;
  }

  const next: UploadRecord = {
    ...existing,
    ...update,
    status,
    audit,
  };

  records[index] = next;
  writeStore(records);
  return next;
}
