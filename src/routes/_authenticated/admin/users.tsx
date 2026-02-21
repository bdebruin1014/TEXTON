import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

interface UserRecord {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  department: string | null;
  last_sign_in: string | null;
  status: string;
}

function UsersAdmin() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addUser = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("user_profiles").insert({
        email: values.email,
        full_name: values.full_name,
        role: values.role || "User",
        status: "Invited",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User added");
    },
    onError: () => {
      toast.error("Failed to add user");
    },
  });

  const columns: ColumnDef<UserRecord, unknown>[] = [
    {
      accessorKey: "full_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("full_name") ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string | null;
        return role ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{role}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("department") ?? "—"}</span>,
    },
    {
      accessorKey: "last_sign_in",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Sign In" />,
      cell: ({ row }) => {
        const val = row.getValue("last_sign_in") as string | null;
        return val ? formatDate(val) : "Never";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted">{users.length} team members</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add User
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : users.length === 0 ? (
        <EmptyState title="No users" description="Add team members and assign roles" />
      ) : (
        <DataTable columns={columns} data={users} searchKey="full_name" searchPlaceholder="Search users..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add User"
        fields={[
          { name: "email", label: "Email", type: "email", required: true },
          { name: "full_name", label: "Full name", type: "text", required: true },
          {
            name: "role",
            label: "Role",
            type: "select",
            options: ["Admin", "Manager", "User", "Viewer"],
            defaultValue: "User",
          },
        ]}
        onSubmit={async (values) => {
          await addUser.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addUser.isPending}
      />
    </div>
  );
}
