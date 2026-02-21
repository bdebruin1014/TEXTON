import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { COATemplate, COATemplateItem, COAVariables, EntityCOAAssignment } from "@/types/coa";

export function useCOATemplates() {
  return useQuery<COATemplate[]>({
    queryKey: ["coa-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coa_templates").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCOATemplate(templateId: string | undefined) {
  return useQuery<COATemplate>({
    queryKey: ["coa-template", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("templateId required");
      const { data, error } = await supabase.from("coa_templates").select("*").eq("id", templateId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
}

export function useCOATemplateItems(templateId: string | undefined) {
  return useQuery<COATemplateItem[]>({
    queryKey: ["coa-template-items", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("templateId required");
      const { data, error } = await supabase
        .from("coa_template_items")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
}

export function useEntityCOAAssignment(entityId: string | undefined) {
  return useQuery<EntityCOAAssignment | null>({
    queryKey: ["entity-coa-assignment", entityId],
    queryFn: async () => {
      if (!entityId) throw new Error("entityId required");
      const { data, error } = await supabase
        .from("entity_coa_assignments")
        .select("*")
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });
}

export function useAssignCOA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      templateId,
      variables,
      assignedBy,
    }: {
      entityId: string;
      templateId: string;
      variables: COAVariables;
      assignedBy?: string;
    }) => {
      const { data, error } = await supabase
        .from("entity_coa_assignments")
        .upsert(
          {
            entity_id: entityId,
            template_id: templateId,
            variables,
            assigned_by: assignedBy ?? null,
          },
          { onConflict: "entity_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity-coa-assignment", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useToggleCOALock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      isLocked,
      lockedBy,
    }: {
      accountId: string;
      isLocked: boolean;
      lockedBy?: string;
    }) => {
      const { error } = await supabase
        .from("chart_of_accounts")
        .update({
          is_locked: isLocked,
          locked_by: isLocked ? (lockedBy ?? null) : null,
          locked_at: isLocked ? new Date().toISOString() : null,
        })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
  });
}
