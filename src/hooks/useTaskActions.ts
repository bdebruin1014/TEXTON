import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (taskId: string) => {
      const now = new Date().toISOString();

      // 1. Mark task completed
      const { error: updateError } = await supabase
        .from("task_instances")
        .update({
          status: "completed",
          completed_at: now,
          completed_by: userId ?? null,
        })
        .eq("id", taskId);
      if (updateError) throw updateError;

      // 2. Check if this was a gate task
      const { data: task, error: fetchError } = await supabase
        .from("task_instances")
        .select("id, is_gate, workflow_instance_id, sort_order")
        .eq("id", taskId)
        .single();
      if (fetchError) throw fetchError;

      if (task?.is_gate) {
        // Find downstream blocked tasks in the same workflow instance
        // that come after this task in sort order and unblock them
        const { data: blockedTasks, error: blockedError } = await supabase
          .from("task_instances")
          .select("id")
          .eq("workflow_instance_id", task.workflow_instance_id)
          .eq("status", "blocked")
          .gt("sort_order", task.sort_order);
        if (blockedError) throw blockedError;

        if (blockedTasks && blockedTasks.length > 0) {
          const ids = blockedTasks.map((t: { id: string }) => t.id);
          const { error: unblockError } = await supabase
            .from("task_instances")
            .update({ status: "active" })
            .in("id", ids);
          if (unblockError) throw unblockError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-task-counts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
    },
  });
}

export function useUpdateTaskNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes: string }) => {
      const { error } = await supabase.from("task_instances").update({ notes }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
}
