import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";
import type { InstanceMilestone, InstanceTask, WorkflowInstance } from "@/types/workflows";

// ── Instances ──────────────────────────────────────────────────

export function useWorkflowInstances(recordType?: string, recordId?: string) {
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useQuery<WorkflowInstance[]>({
    queryKey: ["workflow-instances", recordType, recordId, entityId],
    queryFn: async () => {
      let q = supabase
        .from("workflow_instances")
        .select("*, template:workflow_templates(id, name)")
        .order("created_at", { ascending: false });

      if (recordType && recordId) {
        q = q.eq("record_type", recordType).eq("record_id", recordId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkflowInstance(instanceId: string) {
  return useQuery<WorkflowInstance>({
    queryKey: ["workflow-instance", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("*, template:workflow_templates(id, name)")
        .eq("id", instanceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!instanceId,
  });
}

export function useCreateWorkflowInstance() {
  const queryClient = useQueryClient();
  const entityId = useEntityStore((s) => s.activeEntityId);

  return useMutation({
    mutationFn: async (values: {
      templateId: string;
      recordType: string;
      recordId: string;
      name: string;
      chatConversation?: unknown[];
    }) => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .insert({
          template_id: values.templateId,
          entity_id: entityId,
          record_type: values.recordType,
          record_id: values.recordId,
          name: values.name,
          chat_conversation: values.chatConversation ?? [],
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-instances"] }),
  });
}

export function useUpdateWorkflowInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WorkflowInstance>) => {
      const { error } = await supabase.from("workflow_instances").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instance", vars.id] });
    },
  });
}

// ── Milestones ─────────────────────────────────────────────────

export function useInstanceMilestones(instanceId: string) {
  return useQuery<InstanceMilestone[]>({
    queryKey: ["workflow-milestones", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instance_milestones")
        .select("*")
        .eq("instance_id", instanceId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!instanceId,
  });
}

// ── Tasks ──────────────────────────────────────────────────────

export function useInstanceTasks(instanceId: string) {
  return useQuery<InstanceTask[]>({
    queryKey: ["workflow-tasks", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instance_tasks")
        .select("*, assignee:user_profiles(id, full_name, avatar_url), team:teams(id, name, color)")
        .eq("instance_id", instanceId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!instanceId,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; instance_id: string } & Partial<InstanceTask>) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      delete updatePayload.instance_id;
      if (updates.status === "completed") {
        updatePayload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("workflow_instance_tasks").update(updatePayload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks", vars.instance_id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-milestones", vars.instance_id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instance", vars.instance_id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
    },
  });
}

// ── Generate workflow via Edge Function ────────────────────────

export function useGenerateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      instanceId: string;
      templateId: string;
      recordType: string;
      recordId: string;
      chatMessages: unknown[];
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-workflow", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks"] });
    },
  });
}
