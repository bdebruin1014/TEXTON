import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { IndexSidebar, type SidebarFilterItem } from "@/components/layout/IndexSidebar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DISPOSITION_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/")({
  component: DispositionIndex,
});

interface Disposition {
  id: string;
  lot_number: string | null;
  project_name: string | null;
  buyer_name: string | null;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
  updated_at: string;
}

const columns: ColumnDef<Disposition, unknown>[] = [
  {
    accessorKey: "lot_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number") ?? "—"}</span>,
  },
  {
    accessorKey: "project_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("project_name") ?? "—"}</span>,
  },
  {
    accessorKey: "buyer_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Buyer" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("buyer_name") ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "contract_price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contract Price" />,
    cell: ({ row }) => {
      const val = row.getValue("contract_price") as number | null;
      return val ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "closing_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Closing" />,
    cell: ({ row }) => formatDate(row.getValue("closing_date")),
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => formatDate(row.getValue("updated_at")),
  },
];

function DispositionIndex() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: dispositions = [], isLoading } = useQuery<Disposition[]>({
    queryKey: ["dispositions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositions").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (activeFilter === "all") return dispositions;
    return dispositions.filter((d) => d.status === activeFilter);
  }, [dispositions, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dispositions) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [dispositions]);

  const sidebarFilters: SidebarFilterItem[] = [
    { label: "All Dispositions", value: "all", count: dispositions.length },
    ...DISPOSITION_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const totalRevenue = dispositions
    .filter((d) => d.status === "Closed")
    .reduce((sum, d) => sum + (d.contract_price ?? 0), 0);
  const pipeline = dispositions
    .filter((d) => d.status !== "Closed" && d.status !== "Cancelled")
    .reduce((sum, d) => sum + (d.contract_price ?? 0), 0);

  const handleCreate = async () => {
    try {
      const { data, error } = await supabase.from("dispositions").insert({ status: "Lead" }).select().single();
      if (error) throw error;
      toast.success("Disposition created");
      navigate({
        to: `/disposition/${data.id}/overview` as string,
      });
    } catch {
      toast.error("Failed to create disposition");
    }
  };

  const sidebar = (
    <IndexSidebar
      title="Disposition"
      filters={sidebarFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      metrics={[
        { label: "Total", value: dispositions.length },
        { label: "Revenue", value: formatCurrency(totalRevenue) },
        { label: "Pipeline", value: formatCurrency(pipeline) },
      ]}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Disposition</h1>
            <p className="mt-0.5 text-sm text-muted">{activeFilter === "all" ? "All dispositions" : activeFilter}</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            +
            New Disposition
          </button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No dispositions yet"
            description="Create a new disposition to start tracking sales"
           
            action={
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
              >
                +
                New Disposition
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchKey="buyer_name"
            searchPlaceholder="Search dispositions..."
            onRowClick={(row) =>
              navigate({
                to: `/disposition/${row.id}/overview` as string,
              })
            }
          />
        )}
      </div>
    </PageWithSidebar>
  );
}
