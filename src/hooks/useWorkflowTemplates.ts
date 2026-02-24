import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProjectType, WorkflowTemplate, WorkflowTemplateTask } from "@/types/workflows";

// ── Templates ─────────────────────────────────────────────────

export function useWorkflowTemplates() {
  return useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*, workflow_template_tasks(id)")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        ...t,
        task_count: Array.isArray(t.workflow_template_tasks) ? t.workflow_template_tasks.length : 0,
        workflow_template_tasks: undefined,
      }));
    },
  });
}

export function useWorkflowTemplate(templateId: string) {
  return useQuery<WorkflowTemplate>({
    queryKey: ["workflow-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_templates").select("*").eq("id", templateId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      project_type?: ProjectType;
      trigger_table?: string;
      trigger_column?: string;
      trigger_value?: string;
      trigger_event?: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert({
          name: values.name,
          description: values.description || null,
          project_type: values.project_type || "all",
          trigger_table: values.trigger_table || null,
          trigger_column: values.trigger_column || "status",
          trigger_value: values.trigger_value || null,
          trigger_event: values.trigger_event || null,
          is_active: true,
          status: "Active",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
  });
}

export function useUpdateWorkflowTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WorkflowTemplate>) => {
      const { error } = await supabase.from("workflow_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-template", vars.id] });
    },
  });
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
  });
}

export function useDuplicateWorkflowTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      // Fetch original template + tasks
      const { data: source, error: srcErr } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (srcErr) throw srcErr;

      const { data: tasks, error: tasksErr } = await supabase
        .from("workflow_template_tasks")
        .select("*")
        .eq("template_id", sourceId)
        .order("sort_order");
      if (tasksErr) throw tasksErr;

      // Create new template
      const { data: newTemplate, error: insertErr } = await supabase
        .from("workflow_templates")
        .insert({
          name: `${source.name} (Copy)`,
          description: source.description,
          project_type: source.project_type,
          trigger_event: source.trigger_event,
          trigger_table: source.trigger_table,
          trigger_column: source.trigger_column,
          trigger_value: source.trigger_value,
          is_active: false,
          status: "Draft",
          sort_order: source.sort_order,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Copy tasks (re-mapping depends_on references)
      if (tasks && tasks.length > 0) {
        const idMap = new Map<string, string>();
        for (const task of tasks) {
          const { data: newTask, error: taskErr } = await supabase
            .from("workflow_template_tasks")
            .insert({
              template_id: newTemplate.id,
              name: task.name,
              description: task.description,
              phase: task.phase,
              assigned_role: task.assigned_role,
              due_days: task.due_days,
              due_reference: task.due_reference,
              is_gate: task.is_gate,
              gate_condition: task.gate_condition,
              depends_on: null,
              sort_order: task.sort_order,
            })
            .select()
            .single();
          if (taskErr) throw taskErr;
          idMap.set(task.id, newTask.id);
        }

        // Re-map depends_on
        for (const task of tasks) {
          if (task.depends_on && idMap.has(task.depends_on)) {
            const newTaskId = idMap.get(task.id);
            const newDependsOn = idMap.get(task.depends_on);
            if (newTaskId && newDependsOn) {
              await supabase.from("workflow_template_tasks").update({ depends_on: newDependsOn }).eq("id", newTaskId);
            }
          }
        }
      }

      return newTemplate;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
  });
}

// ── Template Tasks ────────────────────────────────────────────

export function useWorkflowTemplateTasks(templateId: string) {
  return useQuery<WorkflowTemplateTask[]>({
    queryKey: ["workflow-template-tasks", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_template_tasks")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      template_id: string;
      name: string;
      phase: string;
      assigned_role: string;
      due_days: number;
      due_reference?: string;
      is_gate?: boolean;
      sort_order: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_template_tasks")
        .insert({
          template_id: values.template_id,
          name: values.name,
          description: values.description || null,
          phase: values.phase,
          assigned_role: values.assigned_role,
          due_days: values.due_days,
          due_reference: values.due_reference || "trigger_date",
          is_gate: values.is_gate ?? false,
          sort_order: values.sort_order,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks", vars.template_id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });
}

export function useUpdateTemplateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      template_id,
      ...updates
    }: { id: string; template_id: string } & Partial<WorkflowTemplateTask>) => {
      const { error } = await supabase.from("workflow_template_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks", vars.template_id] });
    },
  });
}

export function useDeleteTemplateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; template_id: string }) => {
      const { error } = await supabase.from("workflow_template_tasks").delete().eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks", vars.template_id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });
}
