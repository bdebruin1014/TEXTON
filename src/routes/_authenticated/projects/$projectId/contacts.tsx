import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId/contacts")({
  component: Contacts,
});

interface Contact {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
}

const columns: ColumnDef<Contact, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name") ?? "—"}</span>,
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
  },
  {
    accessorKey: "company",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null;
      return email ? (
        <a href={`mailto:${email}`} className="text-info hover:underline">
          {email}
        </a>
      ) : (
        "—"
      );
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
  },
];

function Contacts() {
  const { projectId } = Route.useParams();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_assignments")
        .select("id, role, contacts(id, name, company, email, phone)")
        .eq("record_type", "project")
        .eq("record_id", projectId);
      if (error) throw error;
      return (data ?? []).map((ca: Record<string, unknown>) => {
        const c = ca.contacts as Record<string, unknown> | null;
        return {
          id: ca.id as string,
          name: (c?.name as string) ?? null,
          role: ca.role as string | null,
          company: (c?.company as string) ?? null,
          email: (c?.email as string) ?? null,
          phone: (c?.phone as string) ?? null,
        };
      });
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Link Contact
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : contacts.length === 0 ? (
        <EmptyState title="No contacts linked" description="Link contacts to this project to track relationships" />
      ) : (
        <DataTable columns={columns} data={contacts} searchKey="name" searchPlaceholder="Search contacts..." />
      )}
    </div>
  );
}
