import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investors/")({
  component: FundsList,
});

interface Fund {
  id: string;
  name: string;
  entity_name: string | null;
  fund_type: string | null;
  vintage_year: number | null;
  total_committed: number | null;
  total_called: number | null;
  total_deployed: number | null;
  total_distributed: number | null;
  preferred_return: number | null;
  investor_count: number | null;
  status: string;
}

function FundsList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const { data: funds = [], isLoading } = useQuery<Fund[]>({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funds").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addFund = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data, error } = await supabase
        .from("funds")
        .insert({
          name: values.name,
          fund_type: values.fund_type || null,
          vintage_year: values.vintage_year ? Number(values.vintage_year) : null,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["funds"] });
      toast.success("Fund created");
      setShowModal(false);
      if (data?.id) {
        navigate({ to: `/investors/${data.id}` as string });
      }
    },
    onError: () => toast.error("Failed to create fund"),
  });

  const totalCommitted = funds.reduce((sum, f) => sum + (f.total_committed ?? 0), 0);
  const totalCalled = funds.reduce((sum, f) => sum + (f.total_called ?? 0), 0);
  const totalDistributed = funds.reduce((sum, f) => sum + (f.total_distributed ?? 0), 0);

  const columns: ColumnDef<Fund, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fund Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "entity_name",
      header: "Entity",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("entity_name") ?? "—"}</span>,
    },
    {
      accessorKey: "fund_type",
      header: "Type",
      cell: ({ row }) => {
        const val = row.getValue("fund_type") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
      },
    },
    {
      accessorKey: "vintage_year",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vintage" />,
      cell: ({ row }) => row.getValue("vintage_year") ?? "—",
    },
    {
      accessorKey: "total_committed",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Committed" />,
      cell: ({ row }) => {
        const val = row.getValue("total_committed") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "total_called",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Called" />,
      cell: ({ row }) => {
        const val = row.getValue("total_called") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "total_distributed",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Distributed" />,
      cell: ({ row }) => {
        const val = row.getValue("total_distributed") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "investor_count",
      header: "Investors",
      cell: ({ row }) => row.getValue("investor_count") ?? 0,
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
          <h1 className="text-xl font-semibold text-foreground">Funds</h1>
          <p className="mt-0.5 text-sm text-muted">
            {funds.length} funds · Committed: {formatCurrency(totalCommitted)} · Called: {formatCurrency(totalCalled)} ·
            Distributed: {formatCurrency(totalDistributed)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Fund
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={9} />
      ) : funds.length === 0 ? (
        <EmptyState
          title="No funds"
          description="Create investment funds to track investors, capital calls, and distributions"
        />
      ) : (
        <DataTable
          columns={columns}
          data={funds}
          searchKey="name"
          searchPlaceholder="Search funds..."
          onRowClick={(row) => navigate({ to: `/investors/${row.id}` as string })}
        />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Fund"
        fields={[
          { name: "name", label: "Fund name", type: "text", required: true, placeholder: "Fund name" },
          {
            name: "fund_type",
            label: "Fund type",
            type: "select",
            options: ["Equity Fund", "Debt Fund", "Opportunity Fund", "Development Fund", "Joint Venture"],
            placeholder: "Fund type",
          },
          { name: "vintage_year", label: "Vintage year", type: "number", placeholder: "2025" },
        ]}
        onSubmit={async (values) => {
          addFund.mutate(values);
        }}
        loading={addFund.isPending}
      />
    </div>
  );
}
