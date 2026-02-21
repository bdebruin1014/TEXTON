import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { MATTER_CATEGORY_LABELS, MATTER_STATUS_LABELS, MATTER_STATUSES } from "@/lib/constants";
import { getMatters } from "@/lib/queries/matters";
import type { Matter } from "@/types/matters";

export const Route = createFileRoute("/_authenticated/operations/matters/")({
  component: MattersIndex,
});

const columns: ColumnDef<Matter, unknown>[] = [
  {
    accessorKey: "matter_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Matter #" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("matter_number")}</span>,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <span className="max-w-[300px] truncate block">{row.getValue("title") as string}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status") as string} />,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("priority") as string} />,
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => {
      const cat = row.getValue("category") as string;
      return <span className="text-sm">{MATTER_CATEGORY_LABELS[cat] ?? cat}</span>;
    },
  },
  {
    accessorKey: "target_completion_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Target Date" />,
    cell: ({ row }) => {
      const d = row.getValue("target_completion_date") as string | null;
      return <span className="text-sm text-muted-foreground">{d ? new Date(d).toLocaleDateString() : "---"}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.getValue("created_at") as string).toLocaleDateString()}
      </span>
    ),
  },
];

function MattersIndex() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: matters = [], isLoading } = useQuery<Matter[]>({
    queryKey: ["matters"],
    queryFn: () => getMatters(),
  });

  const filteredMatters = useMemo(() => {
    if (activeFilter === "all") return matters;
    return matters.filter((m) => m.status === activeFilter);
  }, [matters, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matters) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    return counts;
  }, [matters]);

  const openCount = (statusCounts.open ?? 0) + (statusCounts.in_progress ?? 0);
  const criticalCount = matters.filter(
    (m) => m.priority === "critical" && m.status !== "closed" && m.status !== "cancelled",
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Operations</span>
            <span>/</span>
            <span className="text-foreground font-medium">Matters</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Matters</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeFilter === "all" ? "All matters" : (MATTER_STATUS_LABELS[activeFilter] ?? activeFilter)} ·{" "}
            {filteredMatters.length} matter{filteredMatters.length !== 1 ? "s" : ""}
            {openCount > 0 && ` · ${openCount} active`}
            {criticalCount > 0 && ` · ${criticalCount} critical`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/operations/matters/new" })}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + New Matter
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-primary text-white"
              : "bg-card text-muted-foreground border border-border hover:bg-accent"
          }`}
        >
          All ({matters.length})
        </button>
        {MATTER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === s
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >
            {MATTER_STATUS_LABELS[s] ?? s} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filteredMatters.length === 0 ? (
        <EmptyState
          title="No matters yet"
          description="Create a new matter to track contract disputes, legal issues, and other workflows."
          action={
            <button
              type="button"
              onClick={() => navigate({ to: "/operations/matters/new" })}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              + New Matter
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredMatters}
          searchKey="title"
          searchPlaceholder="Search matters..."
          onRowClick={(row) =>
            navigate({
              to: "/operations/matters/$matterId",
              params: { matterId: row.id },
            })
          }
        />
      )}
    </div>
  );
}
