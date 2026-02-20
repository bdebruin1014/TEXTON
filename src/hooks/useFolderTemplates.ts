import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FolderTemplate {
  id: string;
  name: string;
  description: string | null;
  record_type: string;
  project_type: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderTemplateItem {
  id: string;
  template_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  description: string | null;
  auto_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderTemplateWithItems extends FolderTemplate {
  items: FolderTemplateItem[];
}

export function useFolderTemplates(recordType?: string) {
  return useQuery<FolderTemplateWithItems[]>({
    queryKey: ["folder-templates", recordType],
    queryFn: async () => {
      let query = supabase
        .from("folder_templates")
        .select("*, items:folder_template_items(*)")
        .eq("is_active", true)
        .order("name");

      if (recordType) {
        query = query.eq("record_type", recordType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FolderTemplateWithItems[];
    },
  });
}

export function useFolderTemplate(templateId: string) {
  return useQuery<FolderTemplateWithItems>({
    queryKey: ["folder-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folder_templates")
        .select("*, items:folder_template_items(*)")
        .eq("id", templateId)
        .single();
      if (error) throw error;
      return data as FolderTemplateWithItems;
    },
  });
}

export function useSaveFolderTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      template,
      items,
    }: {
      template: Partial<FolderTemplate> & { id: string };
      items: Omit<FolderTemplateItem, "created_at" | "updated_at">[];
    }) => {
      const { data: savedTemplate, error: templateError } = await supabase
        .from("folder_templates")
        .upsert({
          id: template.id,
          name: template.name,
          description: template.description,
          record_type: template.record_type,
          project_type: template.project_type,
          is_default: template.is_default,
          is_active: template.is_active,
        })
        .select()
        .single();
      if (templateError) throw templateError;

      // Delete existing items and re-insert
      await supabase.from("folder_template_items").delete().eq("template_id", savedTemplate.id);

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("folder_template_items")
          .insert(items.map((item) => ({ ...item, template_id: savedTemplate.id })));
        if (itemsError) throw itemsError;
      }

      return savedTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-templates"] });
      qc.invalidateQueries({ queryKey: ["folder-template"] });
    },
  });
}

export function useApplyTemplateToExisting() {
  return useMutation({
    mutationFn: async ({
      templateId,
      recordType,
      projectType,
    }: {
      templateId: string;
      recordType: string;
      projectType?: string;
    }) => {
      const tableName =
        recordType === "opportunity"
          ? "opportunities"
          : recordType === "job"
            ? "jobs"
            : recordType === "disposition"
              ? "dispositions"
              : "projects";

      let query = supabase.from(tableName).select("id");
      if (projectType) {
        query = query.eq("project_type", projectType);
      }

      const { data: records } = await query;
      if (!records) return { applied: 0 };

      let applied = 0;
      for (const record of records) {
        const { count } = await supabase
          .from("document_folders")
          .select("id", { count: "exact", head: true })
          .eq("record_type", recordType)
          .eq("record_id", record.id)
          .not("template_item_id", "is", null);

        if ((count ?? 0) === 0) {
          await supabase.rpc("apply_folder_template", {
            p_template_id: templateId,
            p_record_type: recordType,
            p_record_id: record.id,
          });
          applied++;
        }
      }

      return { applied };
    },
  });
}
