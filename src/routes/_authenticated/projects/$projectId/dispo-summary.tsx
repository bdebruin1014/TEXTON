import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/dispo-summary")({
  component: DispoSummary,
});

interface Disposition {
  id: string;
  lot_number: string | null;
  buyer_name: string | null;
  status: string;
  sale_price: number | null;
  closing_date: string | null;
  net_proceeds: number | null;
}

function DispoSummary() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  const { data: dispositions = [], isLoading } = useQuery<Disposition[]>({
    queryKey: ["project-dispositions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositions")
        .select("id, lot_number, buyer_name, status, sale_price, closing_date, net_proceeds")
        .eq("project_id", projectId)
        .order("lot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalRevenue = dispositions.reduce((sum, d) => sum + (d.sale_price ?? 0), 0);
  const totalProceeds = dispositions.reduce((sum, d) => sum + (d.net_proceeds ?? 0), 0);
  const closedCount = dispositions.filter((d) => d.status === "Closed").length;

  const columns: ColumnDef<Disposition, unknown>[] = [
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number") ?? "—"}</span>,
    },
    {
      accessorKey: "buyer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Buyer" />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "sale_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale Price" />,
      cell: ({ row }) => {
        const val = row.getValue("sale_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "net_proceeds",
      header: "Net Proceeds",
      cell: ({ row }) => {
        const val = row.getValue("net_proceeds") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "closing_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Closing" />,
      cell: ({ row }) => formatDate(row.getValue("closing_date")),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Disposition Summary</h2>
        <p className="mt-0.5 text-sm text-muted">Read-only rollup of all dispositions for this project</p>
      </div>

      {/* Summary KPIs */}
      {dispositions.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Total Dispositions</p>
            <p className="text-lg font-semibold text-foreground">{dispositions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Closed</p>
            <p className="text-lg font-semibold text-foreground">{closedCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Gross Revenue</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Net Proceeds</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalProceeds)}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : dispositions.length === 0 ? (
        <EmptyState title="No dispositions" description="Dispositions will appear here when lots are listed for sale" />
      ) : (
        <DataTable
          columns={columns}
          data={dispositions}
          searchKey="lot_number"
          searchPlaceholder="Search dispositions..."
          onRowClick={(row) => navigate({ to: `/disposition/${row.id}` as string })}
        />
      )}
    </div>
  );
}
