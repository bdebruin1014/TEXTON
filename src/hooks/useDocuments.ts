import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { BUCKET_MAP, getStoragePath } from "@/lib/documents/storage";

export interface DocumentRecord {
  id: string;
  record_type: string;
  record_id: string;
  folder_id: string | null;
  name: string;
  original_filename: string;
  storage_path: string;
  bucket: string;
  mime_type: string;
  file_size: number;
  file_extension: string | null;
  description: string | null;
  tags: string[];
  category: string | null;
  version: number;
  is_current_version: boolean;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  source: string;
  status: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments(recordType: string, recordId: string, folderId: string | null) {
  return useQuery<DocumentRecord[]>({
    queryKey: ["documents", recordType, recordId, folderId],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .eq("status", "active")
        .eq("is_current_version", true)
        .order("created_at", { ascending: false });

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      recordType,
      recordId,
      folderId,
      folderPath,
    }: {
      file: File;
      recordType: string;
      recordId: string;
      folderId: string | null;
      folderPath: string | null;
    }) => {
      const bucket = BUCKET_MAP[recordType];
      if (!bucket) throw new Error(`No bucket for record type: ${recordType}`);

      const storagePath = getStoragePath(recordId, folderPath, `${Date.now()}-${file.name}`);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : null;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          record_type: recordType,
          record_id: recordId,
          folder_id: folderId,
          name: file.name.replace(/\.[^.]+$/, ""),
          original_filename: file.name,
          storage_path: storagePath,
          bucket,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          file_extension: ext,
          source: "upload",
        })
        .select()
        .single();
      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["documents", data.record_type, data.record_id] });
    },
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (doc: { bucket: string; storage_path: string; original_filename: string }) => {
      const { data, error } = await supabase.storage.from(doc.bucket).download(doc.storage_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useRenameDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("documents").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: string; folderId: string | null }) => {
      const { error } = await supabase.from("documents").update({ folder_id: folderId }).eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; bucket: string; storage_path: string }) => {
      await supabase.storage.from(doc.bucket).remove([doc.storage_path]);

      const { error } = await supabase.from("documents").update({ status: "trash" }).eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useArchiveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
