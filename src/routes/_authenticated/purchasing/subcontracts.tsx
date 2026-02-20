import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/purchasing/subcontracts")({
  component: Subcontracts,
});

interface Subcontract {
  id: string;
  contract_number: string | null;
  vendor_name: string | null;
  job_name: string | null;
  project_name: string | null;
  scope_description: string | null;
  contract_amount: number | null;
  paid_to_date: number | null;
  retainage: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

function Subcontracts() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: subcontracts = [], isLoading } = useQuery<Subcontract[]>({
    queryKey: ["subcontracts", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("subcontracts").select("*").order("created_at", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSubcontract = useMutation({
    mutationFn: async () => {
      const count = subcontracts.length + 1;
      const { error } = await supabase.from("subcontracts").insert({
        contract_number: `SC-${String(count).padStart(4, "0")}`,
        status: "Draft",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subcontracts", activeEntityId] }),
  });

  const totalContracted = subcontracts.reduce((sum, s) => sum + (s.contract_amount ?? 0), 0);
  const totalPaid = subcontracts.reduce((sum, s) => sum + (s.paid_to_date ?? 0), 0);

  const columns: ColumnDef<Subcontract, unknown>[] = [
    {
      accessorKey: "contract_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract #" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.getValue("contract_number") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subcontractor" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("vendor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "job_name",
      header: "Job",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("job_name") ?? "—"}</span>,
    },
    {
      accessorKey: "project_name",
      header: "Project",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("project_name") ?? "—"}</span>,
    },
    {
      accessorKey: "scope_description",
      header: "Scope",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted">{row.getValue("scope_description") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "contract_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract" />,
      cell: ({ row }) => {
        const val = row.getValue("contract_amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "paid_to_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" />,
      cell: ({ row }) => {
        const val = row.getValue("paid_to_date") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "retainage",
      header: "Retainage",
      cell: ({ row }) => {
        const val = row.getValue("retainage") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "start_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Start" />,
      cell: ({ row }) => {
        const val = row.getValue("start_date") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Subcontracts</h1>
          <p className="mt-0.5 text-sm text-muted">
            {subcontracts.length} subcontracts · Contracted: {formatCurrency(totalContracted)} · Paid:{" "}
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addSubcontract.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          New Subcontract
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : subcontracts.length === 0 ? (
        <EmptyState title="No subcontracts" description="Manage subcontractor agreements across all jobs" />
      ) : (
        <DataTable
          columns={columns}
          data={subcontracts}
          searchKey="vendor_name"
          searchPlaceholder="Search subcontracts..."
        />
      )}
    </div>
  );
}
