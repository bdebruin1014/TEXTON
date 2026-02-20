import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/")({
  component: RchContractsIndex,
});

interface RchContract {
  id: string;
  contract_number: string | null;
  contract_type: string | null;
  status: string;
  owner_name: string | null;
  unit_count: number | null;
  contract_amount: number | null;
  project_id: string | null;
  created_at: string;
}

const CONTRACT_STATUSES = [
  "Draft",
  "In Progress",
  "Pending Signature",
  "Executed",
  "Jobs Created",
  "Cancelled",
];

const columns: ColumnDef<RchContract, unknown>[] = [
  {
    accessorKey: "contract_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contract #" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("contract_number") ?? "---"}</span>,
  },
  {
    accessorKey: "contract_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const val = row.getValue("contract_type") as string | null;
      if (!val) return <span className="text-muted">---</span>;
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {val}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "owner_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("owner_name") ?? "---"}</span>,
  },
  {
    accessorKey: "unit_count",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Units" />,
    cell: ({ row }) => {
      const val = row.getValue("unit_count") as number | null;
      return val ? val : "---";
    },
  },
  {
    accessorKey: "contract_amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => {
      const val = row.getValue("contract_amount") as number | null;
      return val ? formatCurrency(val) : "---";
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => formatDate(row.getValue("created_at")),
  },
];

function RchContractsIndex() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: contracts = [], isLoading } = useQuery<RchContract[]>({
    queryKey: ["rch-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredContracts = useMemo(() => {
    if (activeFilter === "all") return contracts;
    return contracts.filter((c) => c.status === activeFilter);
  }, [contracts, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const contract of contracts) {
      counts[contract.status] = (counts[contract.status] ?? 0) + 1;
    }
    return counts;
  }, [contracts]);

  const totalAmount = contracts.reduce((sum, c) => sum + (c.contract_amount ?? 0), 0);
  const totalUnits = contracts.reduce((sum, c) => sum + (c.unit_count ?? 0), 0);

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("rch_contracts")
      .insert({ status: "Draft" })
      .select()
      .single();
    if (error) {
      console.error("Failed to create contract:", error);
      return;
    }
    navigate({ to: "/operations/rch-contracts/$contractId/overview", params: { contractId: data.id } });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">RCH Contract Management</h1>
          <p className="mt-0.5 text-sm text-muted">
            {activeFilter === "all" ? "All contracts" : activeFilter} &middot; {filteredContracts.length} contracts
            &middot; {totalUnits} units &middot; {formatCurrency(totalAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({contracts.length})
        </button>
        {CONTRACT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          description="Create a new RCH contract to get started"
          action={
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              New Contract
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredContracts}
          searchKey="contract_number"
          searchPlaceholder="Search contracts..."
          onRowClick={(row) =>
            navigate({ to: "/operations/rch-contracts/$contractId/overview", params: { contractId: row.id } })
          }
        />
      )}
    </div>
  );
}
