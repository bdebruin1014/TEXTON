import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/draws")({
  component: Draws,
});

interface DrawRequest {
  id: string;
  draw_number: number;
  amount: number | null;
  status: string;
  bank_name: string | null;
  submitted_date: string | null;
  approved_date: string | null;
  funded_date: string | null;
  notes: string | null;
}

function Draws() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: draws = [], isLoading } = useQuery<DrawRequest[]>({
    queryKey: ["draws", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_requests")
        .select("*")
        .eq("project_id", projectId)
        .order("draw_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDraw = useMutation({
    mutationFn: async () => {
      const nextNum = draws.length > 0 ? Math.max(...draws.map((d) => d.draw_number)) + 1 : 1;
      const { error } = await supabase.from("draw_requests").insert({
        project_id: projectId,
        draw_number: nextNum,
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draws", projectId] }),
  });

  const totalDrawn = draws.filter((d) => d.status === "Funded").reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const pendingAmount = draws
    .filter((d) => d.status === "Submitted" || d.status === "Approved")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const columns: ColumnDef<DrawRequest, unknown>[] = [
    {
      accessorKey: "draw_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Draw #" />,
      cell: ({ row }) => <span className="font-medium">#{row.getValue("draw_number")}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
      cell: ({ row }) => <span className="text-muted">{row.getValue("bank_name") ?? "—"}</span>,
    },
    {
      accessorKey: "submitted_date",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.getValue("submitted_date")),
    },
    {
      accessorKey: "funded_date",
      header: "Funded",
      cell: ({ row }) => formatDate(row.getValue("funded_date")),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Draw Management</h2>
          {draws.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {formatCurrency(totalDrawn)} drawn · {formatCurrency(pendingAmount)} pending
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addDraw.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Draw Request
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : draws.length === 0 ? (
        <EmptyState title="No draw requests" description="Create draw requests to track loan disbursements" />
      ) : (
        <DataTable columns={columns} data={draws} searchKey="draw_number" searchPlaceholder="Search draws..." />
      )}
    </div>
  );
}
