import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModuleIndex, type ModuleKpi, type StatusTab } from "@/components/layout/ModuleIndex";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { OPPORTUNITY_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/pipeline/")({
  component: PipelineIndex,
});

interface Opportunity {
  id: string;
  opportunity_name: string;
  record_number: string | null;
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
    accessorKey: "record_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("record_number") ?? "—"}</span>,
    size: 180,
  },
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
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity deleted");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to delete opportunity"),
  });

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["opportunities", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const allColumns = useMemo(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this opportunity? This cannot be undone.")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            Delete
          </button>
        ),
        size: 80,
      } as ColumnDef<Opportunity, unknown>,
    ],
    [deleteMutation],
  );

  const filteredOpportunities = useMemo(() => {
    if (activeStatus === "all") return opportunities;
    return opportunities.filter((o) => o.status === activeStatus);
  }, [opportunities, activeStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      counts[opp.status] = (counts[opp.status] ?? 0) + 1;
    }
    return counts;
  }, [opportunities]);

  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  const kpis: ModuleKpi[] = [
    { label: "Total Opportunities", value: opportunities.length },
    { label: "Pipeline Value", value: formatCurrency(totalValue) },
    {
      label: "New Leads",
      value: statusCounts["New Lead"] ?? 0,
      accentColor: "var(--color-primary-accent)",
    },
    {
      label: "Under Review",
      value: statusCounts["Under Review"] ?? 0,
      accentColor: "#3B6FA0",
    },
  ];

  const statusTabs: StatusTab[] = [
    { label: "All", value: "all", count: opportunities.length },
    ...OPPORTUNITY_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const handleCreate = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          opportunity_name: "New Opportunity",
          status: "New Lead",
          entity_id: activeEntityId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Opportunity created");
      navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: data.id } });
    } catch {
      toast.error("Failed to create opportunity");
    }
  };

  return (
    <ModuleIndex
      title="Pipeline"
      subtitle={activeStatus === "all" ? "All opportunities" : activeStatus}
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Opportunity"
      onCreateWithAI={() => navigate({ to: "/pipeline/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <DataTable
          columns={allColumns}
          data={filteredOpportunities}
          searchKey="opportunity_name"
          searchPlaceholder="Search opportunities..."
          onRowClick={(row) =>
            navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: row.id } })
          }
        />
      )}
    </ModuleIndex>
  );
}
