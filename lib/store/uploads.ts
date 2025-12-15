export interface UploadMeta {
  id: string;
  filename: string;
  size: number;
  type: string;
  language?: string;
  uploadedAt: string;
}

const store = new Map<string, UploadMeta>();

export function saveUpload(meta: UploadMeta) {
  store.set(meta.id, meta);
}

export function getUpload(id: string) {
  return store.get(id);
}

export function upsertLanguage(id: string, language: string) {
  const existing = store.get(id);
  if (existing) {
    store.set(id, { ...existing, language });
  }
}
