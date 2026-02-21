import { supabase } from "@/lib/supabase";

export const BUCKET_MAP: Record<string, string> = {
  project: "project-docs",
  opportunity: "project-docs", // opportunities share project bucket
  job: "job-docs",
  disposition: "disposition-docs",
  entity: "entity-docs",
  contact: "contact-docs",
};

export function getStoragePath(recordId: string, folderPath: string | null, filename: string): string {
  const parts = [recordId];
  if (folderPath) parts.push(folderPath);
  parts.push(filename);
  return parts.join("/");
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}
