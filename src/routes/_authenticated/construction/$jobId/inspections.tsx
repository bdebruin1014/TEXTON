import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useAuthStore } from "@/stores/authStore";
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
  const [showModal, setShowModal] = useState(false);

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
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("inspections").insert({
        job_id: jobId,
        inspection_type: values.inspection_type || "Foundation",
        status: "Scheduled",
        scheduled_date: values.scheduled_date || null,
        inspector: values.inspector_name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections", jobId] });
      toast.success("Inspection scheduled");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to schedule inspection"),
  });

  const updateInspection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("inspections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inspections", jobId] }),
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

  const deleteInspection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inspections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections", jobId] });
      toast.success("Inspection deleted");
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete inspection");
      setConfirmDeleteId(null);
    },
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (confirmDeleteId === row.original.id) {
          return (
            <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted">Delete this inspection?</span>
              <button
                type="button"
                onClick={() => deleteInspection.mutate(row.original.id)}
                disabled={deleteInspection.isPending}
                className="font-medium text-destructive hover:underline"
              >
                {deleteInspection.isPending ? "Deleting..." : "Delete"}
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
          <h2 className="text-lg font-semibold text-foreground">Inspections</h2>
          {inspections.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {passedCount} of {inspections.length} passed
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Schedule Inspection
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule Inspection"
        fields={[
          {
            name: "inspection_type",
            label: "Inspection type",
            type: "select",
            required: true,
            options: ["Foundation", "Framing", "Electrical", "Plumbing", "Mechanical", "Final", "Other"],
          },
          { name: "scheduled_date", label: "Scheduled date", type: "date", required: true },
          { name: "inspector_name", label: "Inspector", type: "text" },
        ]}
        onSubmit={async (values) => {
          addInspection.mutate(values);
        }}
        loading={addInspection.isPending}
      />

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
