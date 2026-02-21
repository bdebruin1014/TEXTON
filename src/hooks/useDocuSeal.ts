import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";

interface DocuSealConfig {
  id: string;
  entity_id: string;
  api_key: string;
  api_url: string;
  is_active: boolean;
}

export function useDocuSealConfig() {
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useQuery<DocuSealConfig | null>({
    queryKey: ["docuseal-config", entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const { data, error } = await supabase
        .from("docuseal_config")
        .select("*")
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });
}

export function useSaveDocuSealConfig() {
  const queryClient = useQueryClient();
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useMutation({
    mutationFn: async ({ apiKey, apiUrl = "https://api.docuseal.co" }: { apiKey: string; apiUrl?: string }) => {
      if (!entityId) throw new Error("No entity selected");

      const { error } = await supabase.from("docuseal_config").upsert(
        {
          entity_id: entityId,
          api_key: apiKey,
          api_url: apiUrl,
          is_active: true,
        },
        { onConflict: "entity_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docuseal-config", entityId] }),
  });
}

export function useSyncDocuSealTemplates() {
  const queryClient = useQueryClient();
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("docuseal-sync-templates", {
        body: { entityId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["esign-templates"] }),
  });
}

export function useCreateDocuSealSubmission() {
  const queryClient = useQueryClient();
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useMutation({
    mutationFn: async (params: {
      documentId: string;
      templateId: string;
      signers: Array<{ name: string; email: string; role: string }>;
      fieldValues?: unknown;
    }) => {
      const { data, error } = await supabase.functions.invoke("docuseal-create-submission", {
        body: { entityId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
      queryClient.invalidateQueries({ queryKey: ["esign-signers"] });
    },
  });
}
