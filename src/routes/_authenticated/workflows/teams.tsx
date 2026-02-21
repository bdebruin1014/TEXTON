import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useTeamMutation, useTeams } from "@/hooks/useTeams";
import { TEAM_TYPE_LABELS } from "@/lib/constants";
import type { Team } from "@/types/teams";

export const Route = createFileRoute("/_authenticated/workflows/teams")({
  component: TeamsPage,
});

function TeamsPage() {
  const { data: teams = [], isLoading } = useTeams();
  const { create } = useTeamMutation();
  const navigate = useNavigate();

  const handleCreate = async () => {
    const result = await create.mutateAsync({ name: "New Team" });
    if (result?.id) {
      navigate({ to: "/workflows/teams/$teamId", params: { teamId: result.id } });
    }
  };

  const columns: ColumnDef<Team, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.original.color ?? "#4A8C5E" }} />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "team_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium">
          {TEAM_TYPE_LABELS[row.getValue("team_type") as string] ?? row.getValue("team_type")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "member_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
      cell: ({ row }) => row.getValue("member_count") ?? 0,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color = status === "Active" ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Teams</h1>
          <p className="mt-0.5 text-sm text-muted">Manage teams for workflow and record assignment</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={create.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Team
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : teams.length === 0 ? (
        <EmptyState title="No teams" description="Create teams to organize people and assign them to records" />
      ) : (
        <DataTable
          columns={columns}
          data={teams}
          searchKey="name"
          searchPlaceholder="Search teams..."
          onRowClick={(row) => navigate({ to: "/workflows/teams/$teamId", params: { teamId: row.id } })}
        />
      )}
    </div>
  );
}
