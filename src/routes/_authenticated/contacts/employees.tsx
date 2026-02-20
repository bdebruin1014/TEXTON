import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contacts/employees")({
  component: Employees,
});

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  status: string;
}

function Employees() {
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("last_name").order("first_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEmployee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees").insert({
        first_name: "New",
        last_name: "Employee",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const activeCount = employees.filter((e) => e.status === "Active").length;

  const columns: ColumnDef<Employee, unknown>[] = [
    {
      accessorKey: "last_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("last_name") ?? "—"}</span>,
    },
    {
      accessorKey: "first_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("first_name") ?? "—"}</span>,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("title") ?? "—"}</span>,
    },
    {
      accessorKey: "department",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => {
        const val = row.getValue("department") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("email") ?? "—"}</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("phone") ?? "—"}</span>,
    },
    {
      accessorKey: "hire_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hire Date" />,
      cell: ({ row }) => {
        const val = row.getValue("hire_date") as string | null;
        return val ? formatDate(val) : "—";
      },
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
          <h1 className="text-xl font-semibold text-foreground">Employees</h1>
          <p className="mt-0.5 text-sm text-muted">
            {employees.length} employees · {activeCount} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => addEmployee.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Add Employee
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees" description="Add team members to the internal directory" />
      ) : (
        <DataTable columns={columns} data={employees} searchKey="last_name" searchPlaceholder="Search employees..." />
      )}
    </div>
  );
}
