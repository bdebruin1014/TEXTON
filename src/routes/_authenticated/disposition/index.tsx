import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModuleIndex, type ModuleKpi, type StatusTab } from "@/components/layout/ModuleIndex";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DISPOSITION_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

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
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: dispositions = [], isLoading } = useQuery<Disposition[]>({
    queryKey: ["dispositions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositions").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (activeStatus === "all") return dispositions;
    return dispositions.filter((d) => d.status === activeStatus);
  }, [dispositions, activeStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dispositions) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [dispositions]);

  const totalRevenue = dispositions
    .filter((d) => d.status === "Closed")
    .reduce((sum, d) => sum + (d.contract_price ?? 0), 0);
  const pipeline = dispositions
    .filter((d) => d.status !== "Closed" && d.status !== "Cancelled")
    .reduce((sum, d) => sum + (d.contract_price ?? 0), 0);

  const kpis: ModuleKpi[] = [
    { label: "Total Dispositions", value: dispositions.length },
    { label: "Revenue (Closed)", value: formatCurrency(totalRevenue), accentColor: "#48BB78" },
    { label: "Pipeline Value", value: formatCurrency(pipeline), accentColor: "#3B6FA0" },
    {
      label: "Pending Close",
      value: statusCounts["Under Contract"] ?? 0,
      accentColor: "#C4841D",
    },
  ];

  const statusTabs: StatusTab[] = [
    { label: "All", value: "all", count: dispositions.length },
    ...DISPOSITION_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const handleCreate = async () => {
    try {
      const { data, error } = await supabase
        .from("dispositions")
        .insert({
          status: "Lead",
          entity_id: activeEntityId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Disposition created");
      navigate({
        to: `/disposition/${data.id}/overview` as string,
      });
    } catch {
      toast.error("Failed to create disposition");
    }
  };

  return (
    <ModuleIndex
      title="Disposition"
      subtitle={activeStatus === "all" ? "All dispositions" : activeStatus}
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Disposition"
      fabLabel="New Disposition"
      actions={[
        {
          label: "Blank Disposition",
          description: "Create a new empty disposition record",
          onClick: handleCreate,
        },
        {
          label: "Create with AI",
          description: "Describe a sale and let AI populate the fields",
          onClick: () => toast.info("AI creation coming soon"),
          ai: true,
        },
      ]}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No dispositions yet" description="Create a new disposition to start tracking sales" />
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
    </ModuleIndex>
  );
}
