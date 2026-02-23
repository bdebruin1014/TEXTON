import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/daily-logs")({
  component: DailyLogs,
});

interface DailyLog {
  id: string;
  log_date: string;
  weather: string | null;
  temperature: string | null;
  crew_count: number | null;
  work_performed: string | null;
  delays: string | null;
  safety_incidents: string | null;
  created_by: string | null;
}

function DailyLogs() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ["daily-logs", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("job_id", jobId)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLog = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("daily_logs").insert({
        job_id: jobId,
        log_date: values.log_date || new Date().toISOString().split("T")[0],
        weather: values.weather || null,
        work_performed: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-logs", jobId] });
      toast.success("Daily log created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create daily log"),
  });

  const user = useAuthStore((s) => s.user);
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });
  const canDelete = userRole === "admin" || userRole === "software_admin";
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-logs", jobId] });
      toast.success("Daily log deleted");
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete daily log");
      setConfirmDeleteId(null);
    },
  });

  const columns: ColumnDef<DailyLog, unknown>[] = [
    {
      accessorKey: "log_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("log_date"))}</span>,
    },
    {
      accessorKey: "weather",
      header: "Weather",
      cell: ({ row }) => <span className="text-muted">{row.getValue("weather") ?? "—"}</span>,
    },
    {
      accessorKey: "temperature",
      header: "Temp",
      cell: ({ row }) => <span className="text-muted">{row.getValue("temperature") ?? "—"}</span>,
    },
    {
      accessorKey: "crew_count",
      header: "Crew",
      cell: ({ row }) => {
        const val = row.getValue("crew_count") as number | null;
        return val ?? "—";
      },
    },
    {
      accessorKey: "work_performed",
      header: "Work Performed",
      cell: ({ row }) => {
        const val = row.getValue("work_performed") as string | null;
        return <span className="max-w-[300px] truncate text-sm text-muted">{val ?? "—"}</span>;
      },
    },
    {
      accessorKey: "delays",
      header: "Delays",
      cell: ({ row }) => {
        const val = row.getValue("delays") as string | null;
        return val ? <span className="text-xs text-warning">{val}</span> : "—";
      },
    },
    {
      accessorKey: "safety_incidents",
      header: "Safety",
      cell: ({ row }) => {
        const val = row.getValue("safety_incidents") as string | null;
        return val ? (
          <span className="text-xs text-destructive">{val}</span>
        ) : (
          <span className="text-xs text-success">None</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (confirmDeleteId === row.original.id) {
          return (
            <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted">Delete this log?</span>
              <button
                type="button"
                onClick={() => deleteLog.mutate(row.original.id)}
                disabled={deleteLog.isPending}
                className="font-medium text-destructive hover:underline"
              >
                {deleteLog.isPending ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="font-medium text-muted hover:underline"
              >
                Cancel
              </button>
            </div>
          );
        }
        if (!canDelete) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(row.original.id);
            }}
            className="rounded p-1 text-xs text-muted transition-colors hover:text-destructive"
          >
            Delete
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Daily Logs</h2>
          {logs.length > 0 && <p className="mt-0.5 text-sm text-muted">{logs.length} entries</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Daily Log
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Daily Log"
        fields={[
          {
            name: "log_date",
            label: "Date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
          },
          { name: "weather", label: "Weather", type: "select", options: ["Clear", "Cloudy", "Rain", "Snow", "Wind"] },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          addLog.mutate(values);
        }}
        loading={addLog.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState title="No daily logs" description="Record daily construction activity and conditions" />
      ) : (
        <DataTable columns={columns} data={logs} searchKey="work_performed" searchPlaceholder="Search logs..." />
      )}
    </div>
  );
}
