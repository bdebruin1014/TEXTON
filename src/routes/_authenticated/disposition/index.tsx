import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/disposition/")({
  component: DispositionIndex,
});

interface Disposition {
  id: string;
  record_number: string | null;
  address: string | null;
  lot_number: string | null;
  project_name: string | null;
  project_id: string | null;
  buyer_name: string | null;
  status: string;
  base_price: number | null;
  contract_price: number | null;
  closing_date: string | null;
  listed_date: string | null;
  entity_id: string | null;
  updated_at: string;
}

/* ── Status pill groupings ── */
const DISPOSITION_PILL_GROUPS = [
  { label: "All", value: "all", statuses: [] as string[] },
  { label: "Listing Prep", value: "listing-prep", statuses: ["Lead", "Reserved"] },
  { label: "Active", value: "active", statuses: ["Option Selections", "Builder Walk"] },
  { label: "Under Contract", value: "under-contract", statuses: ["Under Contract"] },
  { label: "Closing Scheduled", value: "closing-scheduled", statuses: ["Closing Scheduled"] },
  { label: "Closed", value: "closed", statuses: ["Closed"] },
];

function daysBetween(from: string | null, to: string | Date | null): number | null {
  if (!from) return null;
  const start = new Date(from);
  const end = to ? (typeof to === "string" ? new Date(to) : to) : new Date();
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function DispositionIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  /* ── Queries ── */
  const { data: dispositions = [], isLoading } = useQuery<Disposition[]>({
    queryKey: ["dispositions", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("dispositions")
        .select(
          "id,record_number,address,lot_number,project_name,project_id,buyer_name,status,base_price,contract_price,closing_date,listed_date,entity_id,updated_at",
        )
        .order("updated_at", { ascending: false });
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Delete mutation ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dispositions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispositions"] });
      toast.success("Disposition deleted");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to delete disposition"),
  });

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    if (activeStatus === "all") return dispositions;
    const group = DISPOSITION_PILL_GROUPS.find((g) => g.value === activeStatus);
    if (!group) return dispositions;
    return dispositions.filter((d) => group.statuses.includes(d.status));
  }, [dispositions, activeStatus]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dispositions) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [dispositions]);

  /* ── KPIs ── */
  const activeListings = dispositions.filter((d) => d.status !== "Closed" && d.status !== "Cancelled").length;
  const underContract = statusCounts["Under Contract"] ?? 0;

  const now = new Date();
  const closingsThisMonth = dispositions.filter((d) => {
    if (!d.closing_date) return false;
    const cd = new Date(d.closing_date);
    return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear();
  }).length;

  const avgDOM = useMemo(() => {
    const withDates = dispositions.filter((d) => d.listed_date);
    if (withDates.length === 0) return 0;
    const total = withDates.reduce((sum, d) => {
      const end = d.status === "Closed" && d.closing_date ? d.closing_date : null;
      return sum + (daysBetween(d.listed_date, end) ?? 0);
    }, 0);
    return Math.round(total / withDates.length);
  }, [dispositions]);

  const kpis: ModuleKpi[] = [
    { label: "Active Listings", value: activeListings, accentColor: "var(--color-primary-accent)" },
    { label: "Under Contract", value: underContract, accentColor: "#C4841D" },
    { label: "Closings This Month", value: closingsThisMonth, accentColor: "#3B6FA0" },
    { label: "Avg DOM", value: avgDOM },
  ];

  /* ── Status tabs ── */
  const statusTabs: StatusTab[] = DISPOSITION_PILL_GROUPS.map((g) => ({
    label: g.label,
    value: g.value,
    count: g.value === "all" ? dispositions.length : g.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0),
  }));

  /* ── Columns ── */
  const columns: ColumnDef<Disposition, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "address",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue("address") ?? "—"}</span>,
      },
      {
        accessorKey: "project_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="truncate text-sm font-medium text-info-text hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (row.original.project_id) {
                navigate({
                  to: "/projects/$projectId/basic-info",
                  params: { projectId: row.original.project_id },
                });
              }
            }}
          >
            {row.getValue("project_name") ?? "—"}
          </button>
        ),
      },
      {
        accessorKey: "lot_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("lot_number") ?? "—"}</span>,
        size: 80,
      },
      {
        accessorKey: "base_price",
        header: ({ column }) => <DataTableColumnHeader column={column} title="List Price" />,
        cell: ({ row }) => {
          const val = row.getValue("base_price") as number | null;
          return val ? formatCurrency(val) : "—";
        },
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
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      },
      {
        accessorKey: "buyer_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Buyer" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("buyer_name") ?? "—"}</span>,
      },
      {
        accessorKey: "closing_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Close Date" />,
        cell: ({ row }) => <span className="text-muted">{formatDate(row.getValue("closing_date"))}</span>,
      },
      {
        id: "days_on_market",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Days on Market" />,
        accessorFn: (row) => {
          const end = row.status === "Closed" && row.closing_date ? row.closing_date : null;
          return daysBetween(row.listed_date, end);
        },
        cell: ({ getValue }) => {
          const days = getValue() as number | null;
          return <span className="font-mono text-xs text-muted">{days ?? "—"}</span>;
        },
        size: 120,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this disposition? This cannot be undone.")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            Delete
          </button>
        ),
        size: 80,
      },
    ],
    [navigate, deleteMutation],
  );

  /* ── Create handler ── */
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
      subtitle={
        activeStatus === "all"
          ? "All dispositions"
          : (DISPOSITION_PILL_GROUPS.find((g) => g.value === activeStatus)?.label ?? activeStatus)
      }
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Disposition"
      onCreateWithAI={() => navigate({ to: "/disposition/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No dispositions yet" description="Create a new disposition to start tracking sales" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="address"
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
