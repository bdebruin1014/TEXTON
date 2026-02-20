import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/inspections")({
  component: Inspections,
});

interface Inspection {
  id: string;
  inspection_type: string;
  inspector: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  result: string | null;
  status: string;
  notes: string | null;
}

function Inspections() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery<Inspection[]>({
    queryKey: ["inspections", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .eq("job_id", jobId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addInspection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inspections").insert({
        job_id: jobId,
        inspection_type: "Foundation",
        status: "Scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inspections", jobId] }),
  });

  const updateInspection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("inspections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inspections", jobId] }),
  });

  const passedCount = inspections.filter((i) => i.result === "Pass").length;

  const columns: ColumnDef<Inspection, unknown>[] = [
    {
      accessorKey: "inspection_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("inspection_type")}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <select
            value={item.status}
            onChange={(e) => {
              e.stopPropagation();
              updateInspection.mutate({ id: item.id, updates: { status: e.target.value } });
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
          >
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        );
      },
    },
    {
      accessorKey: "result",
      header: "Result",
      cell: ({ row }) => {
        const result = row.getValue("result") as string | null;
        if (!result) return "—";
        return <StatusBadge status={result} />;
      },
    },
    {
      accessorKey: "inspector",
      header: "Inspector",
      cell: ({ row }) => <span className="text-muted">{row.getValue("inspector") ?? "—"}</span>,
    },
    {
      accessorKey: "scheduled_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Scheduled" />,
      cell: ({ row }) => formatDate(row.getValue("scheduled_date")),
    },
    {
      accessorKey: "completed_date",
      header: "Completed",
      cell: ({ row }) => formatDate(row.getValue("completed_date")),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inspections</h2>
          {inspections.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {passedCount} of {inspections.length} passed
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addInspection.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Schedule Inspection
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : inspections.length === 0 ? (
        <EmptyState title="No inspections" description="Schedule inspections to track building code compliance" />
      ) : (
        <DataTable
          columns={columns}
          data={inspections}
          searchKey="inspection_type"
          searchPlaceholder="Search inspections..."
        />
      )}
    </div>
  );
}
