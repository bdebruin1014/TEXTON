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
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/subcontracts")({
  component: Subcontracts,
});

interface Subcontract {
  id: string;
  contract_number: string | null;
  subcontractor_name: string | null;
  scope: string | null;
  amount: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cost_code: string | null;
}

function Subcontracts() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: subs = [], isLoading } = useQuery<Subcontract[]>({
    queryKey: ["subcontracts", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontracts")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSub = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("subcontracts").insert({
        job_id: jobId,
        status: "Draft",
        subcontractor_name: values.subcontractor_name || null,
        scope: values.scope || null,
        amount: values.contract_amount ? Number(values.contract_amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontracts", jobId] });
      toast.success("Subcontract created");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create subcontract"),
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

  const deleteSub = useMutation({
    mutationFn: async (id: string) => {
      const { count: invCount } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("subcontract_id", id);
      if (invCount && invCount > 0) {
        throw new Error(`Cannot delete: ${invCount} linked invoice(s) exist. Remove them first.`);
      }
      const { count: coCount } = await supabase
        .from("change_orders")
        .select("id", { count: "exact", head: true })
        .eq("subcontract_id", id);
      if (coCount && coCount > 0) {
        throw new Error(`Cannot delete: ${coCount} linked change order(s) exist. Remove them first.`);
      }
      const { error } = await supabase.from("subcontracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontracts", jobId] });
      toast.success("Subcontract deleted");
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete subcontract");
      setConfirmDeleteId(null);
    },
  });

  const totalAmount = subs.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const columns: ColumnDef<Subcontract, unknown>[] = [
    {
      accessorKey: "contract_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract #" />,
      cell: ({ row }) => <span className="font-medium font-mono">{row.getValue("contract_number") ?? "—"}</span>,
    },
    {
      accessorKey: "subcontractor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subcontractor" />,
    },
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => <span className="text-muted">{row.getValue("scope") ?? "—"}</span>,
    },
    {
      accessorKey: "cost_code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("cost_code") ?? "—"}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "start_date",
      header: "Start",
      cell: ({ row }) => formatDate(row.getValue("start_date")),
    },
    {
      accessorKey: "end_date",
      header: "End",
      cell: ({ row }) => formatDate(row.getValue("end_date")),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (confirmDeleteId === row.original.id) {
          return (
            <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted">Delete this subcontract?</span>
              <button
                type="button"
                onClick={() => deleteSub.mutate(row.original.id)}
                disabled={deleteSub.isPending}
                className="font-medium text-destructive hover:underline"
              >
                {deleteSub.isPending ? "Deleting..." : "Delete"}
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
          <h2 className="text-lg font-semibold text-foreground">Subcontracts</h2>
          {subs.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {subs.length} contracts · {formatCurrency(totalAmount)} total
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Subcontract
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Subcontract"
        fields={[
          { name: "subcontractor_name", label: "Subcontractor", type: "text", required: true },
          { name: "scope", label: "Scope of work", type: "text" },
          { name: "contract_amount", label: "Contract amount", type: "number" },
        ]}
        onSubmit={async (values) => {
          addSub.mutate(values);
        }}
        loading={addSub.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : subs.length === 0 ? (
        <EmptyState title="No subcontracts" description="Create subcontracts to manage trade relationships" />
      ) : (
        <DataTable
          columns={columns}
          data={subs}
          searchKey="subcontractor_name"
          searchPlaceholder="Search subcontracts..."
        />
      )}
    </div>
  );
}
