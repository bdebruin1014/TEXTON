import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { type CostBook, useCostBooks } from "@/hooks/useCostBooks";
import { STATUS_COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/cost-books")({
  component: CostBooksAdmin,
});

function CostBooksAdmin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: books = [], isLoading } = useCostBooks();

  const addBook = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cost_books").insert({
        name: "New Cost Book",
        status: "Draft",
        effective_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cost-books"] }),
  });

  const columns: ColumnDef<CostBook, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.getValue("name")}</span>
          {row.original.is_default && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const colors = STATUS_COLORS[status] ?? { bg: "bg-accent", text: "text-muted-foreground" };
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>{status}</span>
        );
      },
    },
    {
      accessorKey: "effective_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Effective Date" />,
      cell: ({ row }) => {
        const val = row.getValue("effective_date") as string | null;
        return val ? new Date(val).toLocaleDateString() : "—";
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const val = row.getValue("description") as string | null;
        return <span className="text-sm text-muted">{val ?? "—"}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const val = row.getValue("created_at") as string;
        return new Date(val).toLocaleDateString();
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cost Books</h1>
          <p className="mt-0.5 text-sm text-muted">{books.length} pricing vintages</p>
        </div>
        <button
          type="button"
          onClick={() => addBook.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Cost Book
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : books.length === 0 ? (
        <EmptyState
          title="No cost books"
          description="Create pricing vintages to track and version vendor costs over time"
        />
      ) : (
        <DataTable
          columns={columns}
          data={books}
          searchKey="name"
          searchPlaceholder="Search cost books..."
          onRowClick={(book) => navigate({ to: "/admin/cost-books/$bookId", params: { bookId: book.id } })}
        />
      )}
    </div>
  );
}
