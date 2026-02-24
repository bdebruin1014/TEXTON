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
  address_street: string | null;
  address_city: string | null;
  municipality_id: string | null;
  status: string;
  project_type: string | null;
  priority: string | null;
  probability: number | null;
  estimated_value: number | null;
  offer_amount: number | null;
  assigned_to: string | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Municipality {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  user_id: string | null;
  full_name: string | null;
}

/* ── Status pill groupings ── */
const PIPELINE_PILL_GROUPS = [
  { label: "All", value: "all", statuses: [] as string[] },
  { label: "New", value: "new", statuses: ["New Lead"] },
  { label: "Screening", value: "screening", statuses: ["Qualifying"] },
  { label: "Analysis", value: "analysis", statuses: ["Analyzing"] },
  { label: "DD", value: "dd", statuses: ["Due Diligence"] },
  { label: "Under Contract", value: "under-contract", statuses: ["Under Contract"] },
  { label: "Won", value: "won", statuses: ["Closed Won", "Converted"] },
  { label: "Dead/Archived", value: "dead", statuses: ["Closed Lost", "On Hold"] },
];

function daysBetween(from: string | null, to: Date = new Date()): number | null {
  if (!from) return null;
  const diff = to.getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function PipelineIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  /* ── Queries ── */
  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["opportunities", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select(
          "id,opportunity_name,record_number,address_street,address_city,municipality_id,status,project_type,priority,probability,estimated_value,offer_amount,assigned_to,entity_id,created_at,updated_at",
        )
        .order("updated_at", { ascending: false });
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: municipalities = [] } = useQuery<Municipality[]>({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("id,name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: profiles = [] } = useQuery<UserProfile[]>({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("id,user_id,full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const muniMap = useMemo(() => new Map(municipalities.map((m) => [m.id, m.name])), [municipalities]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id ?? p.id, p.full_name ?? "—"])), [profiles]);

  /* ── Delete mutation ── */
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

  /* ── Filtering ── */
  const filteredOpportunities = useMemo(() => {
    if (activeStatus === "all") return opportunities;
    const group = PIPELINE_PILL_GROUPS.find((g) => g.value === activeStatus);
    if (!group) return opportunities;
    return opportunities.filter((o) => group.statuses.includes(o.status));
  }, [opportunities, activeStatus]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      counts[opp.status] = (counts[opp.status] ?? 0) + 1;
    }
    return counts;
  }, [opportunities]);

  /* ── KPIs ── */
  const activeAnalyses = statusCounts.Analyzing ?? 0;
  const pendingOffers = statusCounts["Under Contract"] ?? 0;
  const closedWon = (statusCounts["Closed Won"] ?? 0) + (statusCounts.Converted ?? 0);
  const closedLost = statusCounts["Closed Lost"] ?? 0;
  const winRate = closedWon + closedLost > 0 ? Math.round((closedWon / (closedWon + closedLost)) * 100) : 0;

  const kpis: ModuleKpi[] = [
    { label: "Total Opportunities", value: opportunities.length },
    { label: "Active Analyses", value: activeAnalyses, accentColor: "#3B6FA0" },
    { label: "Pending Offers", value: pendingOffers, accentColor: "#C4841D" },
    { label: "Win Rate", value: `${winRate}%`, accentColor: "var(--color-primary-accent)" },
  ];

  /* ── Status tabs ── */
  const statusTabs: StatusTab[] = PIPELINE_PILL_GROUPS.map((g) => ({
    label: g.label,
    value: g.value,
    count: g.value === "all" ? opportunities.length : g.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0),
  }));

  /* ── Columns ── */
  const columns: ColumnDef<Opportunity, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "address_street",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
        cell: ({ row }) => {
          const addr = row.original.address_street;
          const city = row.original.address_city;
          return (
            <div className="min-w-0">
              <div className="truncate font-medium">{addr || row.original.opportunity_name}</div>
              {city && <div className="truncate text-xs text-muted">{city}</div>}
            </div>
          );
        },
      },
      {
        id: "municipality",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Municipality" />,
        accessorFn: (row) => (row.municipality_id ? (muniMap.get(row.municipality_id) ?? "—") : "—"),
        cell: ({ getValue }) => <span className="text-muted">{getValue() as string}</span>,
      },
      {
        accessorKey: "estimated_value",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
        cell: ({ row }) => {
          const val = row.original.offer_amount ?? row.original.estimated_value;
          return val ? formatCurrency(val) : "—";
        },
      },
      {
        accessorKey: "project_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Project Type" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("project_type") ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      },
      {
        id: "days_in_stage",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Days in Stage" />,
        accessorFn: (row) => daysBetween(row.updated_at),
        cell: ({ getValue }) => {
          const days = getValue() as number | null;
          return (
            <span className={days != null && days > 14 ? "font-medium text-warning-text" : "text-muted"}>
              {days ?? "—"}
            </span>
          );
        },
      },
      {
        id: "assigned_to_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned To" />,
        accessorFn: (row) => (row.assigned_to ? (profileMap.get(row.assigned_to) ?? "—") : "—"),
        cell: ({ getValue }) => <span className="text-muted">{getValue() as string}</span>,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
        cell: ({ row }) => <span className="text-muted">{formatDate(row.getValue("updated_at"))}</span>,
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
              if (window.confirm("Delete this opportunity? This cannot be undone.")) {
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
    [muniMap, profileMap, deleteMutation],
  );

  /* ── Create handler ── */
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
      subtitle={
        activeStatus === "all"
          ? "All opportunities"
          : (PIPELINE_PILL_GROUPS.find((g) => g.value === activeStatus)?.label ?? activeStatus)
      }
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Opportunity"
      onCreateWithAI={() => navigate({ to: "/pipeline/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredOpportunities}
          searchKey="address_street"
          searchPlaceholder="Search opportunities..."
          onRowClick={(row) =>
            navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: row.id } })
          }
        />
      )}
    </ModuleIndex>
  );
}
