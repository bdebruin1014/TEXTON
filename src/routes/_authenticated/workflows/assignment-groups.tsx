import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/workflows/assignment-groups")({
  component: AssignmentGroups,
});

interface AssignmentGroup {
  id: string;
  name: string;
  description: string | null;
  member_count: number | null;
  roles: string[] | null;
  status: string;
}

function AssignmentGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery<AssignmentGroup[]>({
    queryKey: ["assignment-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment_groups").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignment_groups").insert({
        name: "New Assignment Group",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignment-groups"] }),
  });

  const columns: ColumnDef<AssignmentGroup, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[] | null;
        if (!roles || roles.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <span key={r} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium">
                {r}
              </span>
            ))}
          </div>
        );
      },
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
        const color = status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Assignment Groups</h1>
          <p className="mt-0.5 text-sm text-muted">Define role groups for workflow task assignment</p>
        </div>
        <button
          type="button"
          onClick={() => addGroup.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New Assignment Group
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState title="No assignment groups" description="Create groups to organize roles for task assignment" />
      ) : (
        <DataTable columns={columns} data={groups} searchKey="name" searchPlaceholder="Search groups..." />
      )}
    </div>
  );
}
