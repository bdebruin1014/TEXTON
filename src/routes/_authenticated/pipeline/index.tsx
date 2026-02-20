import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { IndexSidebar, type SidebarFilterItem } from "@/components/layout/IndexSidebar";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { OPPORTUNITY_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/")({
  component: PipelineIndex,
});

interface Opportunity {
  id: string;
  opportunity_name: string;
  status: string;
  project_type: string | null;
  source: string | null;
  priority: string | null;
  probability: number | null;
  estimated_value: number | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const columns: ColumnDef<Opportunity, unknown>[] = [
  {
    accessorKey: "opportunity_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("opportunity_name")}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "project_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("project_type") ?? "—"}</span>,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
  },
  {
    accessorKey: "estimated_value",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Est. Value" />,
    cell: ({ row }) => {
      const val = row.getValue("estimated_value") as number | null;
      return val ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => formatDate(row.getValue("updated_at")),
  },
];

function PipelineIndex() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredOpportunities = useMemo(() => {
    if (activeFilter === "all") return opportunities;
    return opportunities.filter((o) => o.status === activeFilter);
  }, [opportunities, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      counts[opp.status] = (counts[opp.status] ?? 0) + 1;
    }
    return counts;
  }, [opportunities]);

  const sidebarFilters: SidebarFilterItem[] = [
    { label: "All Opportunities", value: "all", count: opportunities.length },
    ...OPPORTUNITY_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("opportunities")
      .insert({ opportunity_name: "New Opportunity", status: "New Lead" })
      .select()
      .single();
    if (error) {
      console.error("Failed to create opportunity:", error);
      return;
    }
    navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: data.id } });
  };

  const sidebar = (
    <IndexSidebar
      title="Pipeline"
      filters={sidebarFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      metrics={[
        { label: "Total", value: opportunities.length },
        { label: "Pipeline Value", value: formatCurrency(totalValue) },
      ]}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
            <p className="mt-0.5 text-sm text-muted">{activeFilter === "all" ? "All opportunities" : activeFilter}</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            New Opportunity
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <DataTable
            columns={columns}
            data={filteredOpportunities}
            searchKey="opportunity_name"
            searchPlaceholder="Search opportunities..."
            onRowClick={(row) =>
              navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: row.id } })
            }
          />
        )}
      </div>
    </PageWithSidebar>
  );
}
