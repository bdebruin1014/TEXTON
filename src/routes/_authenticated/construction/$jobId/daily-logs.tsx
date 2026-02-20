import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
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
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("daily_logs").insert({
        job_id: jobId,
        log_date: today,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-logs", jobId] }),
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
          onClick={() => addLog.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Daily Log
        </button>
      </div>

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
