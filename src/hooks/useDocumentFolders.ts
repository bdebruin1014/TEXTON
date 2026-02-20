import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DocumentFolder {
  id: string;
  parent_id: string | null;
  record_type: string;
  record_id: string;
  name: string;
  slug: string;
  sort_order: number;
  template_item_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocumentFolders(recordType: string, recordId: string) {
  return useQuery<DocumentFolder[]>({
    queryKey: ["document-folders", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_folders")
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folder: {
      name: string;
      parent_id: string | null;
      record_type: string;
      record_id: string;
    }) => {
      const slug = folder.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await supabase
        .from("document_folders")
        .insert({ ...folder, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["document-folders", data.record_type, data.record_id] });
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("document_folders").update({ name, slug }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folders"] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: folder } = await supabase
        .from("document_folders")
        .select("parent_id")
        .eq("id", id)
        .single();

      // Move child documents to parent folder (or root)
      await supabase.from("documents").update({ folder_id: folder?.parent_id ?? null }).eq("folder_id", id);

      const { error } = await supabase.from("document_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

