import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/deal-sheets/")({
  component: DealSheetsIndex,
});

interface DealSheet {
  id: string;
  name: string | null;
  deal_type: string | null;
  status: string;
  address: string | null;
  asset_sales_price: number | null;
  net_profit_margin: number | null;
  land_cost_ratio: number | null;
  created_at: string;
}

function marginColor(value: number | null): string {
  if (value == null) return "text-muted";
  if (value > 0.1) return "text-green-700";
  if (value >= 0.07) return "text-green-600";
  if (value >= 0.05) return "text-amber-600";
  return "text-red-600";
}

function landRatioColor(value: number | null): string {
  if (value == null) return "text-muted";
  if (value < 0.2) return "text-green-700";
  if (value <= 0.25) return "text-green-600";
  if (value <= 0.3) return "text-amber-600";
  return "text-red-600";
}

const columns: ColumnDef<DealSheet, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name") ?? "Untitled"}</span>,
  },
  {
    accessorKey: "deal_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const val = row.getValue("deal_type") as string | null;
      return val ? (
        <StatusBadge status={val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
      ) : (
        <span className="text-muted">--</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "address",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("address") ?? "--"}</span>,
  },
  {
    accessorKey: "asset_sales_price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ASP" />,
    cell: ({ row }) => {
      const val = row.getValue("asset_sales_price") as number | null;
      return val ? formatCurrency(val) : "--";
    },
  },
  {
    accessorKey: "net_profit_margin",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Net Profit Margin" />,
    cell: ({ row }) => {
      const val = row.getValue("net_profit_margin") as number | null;
      return <span className={marginColor(val)}>{val != null ? formatPercent(val) : "--"}</span>;
    },
  },
  {
    accessorKey: "land_cost_ratio",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Land Cost Ratio" />,
    cell: ({ row }) => {
      const val = row.getValue("land_cost_ratio") as number | null;
      return <span className={landRatioColor(val)}>{val != null ? formatPercent(val) : "--"}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => formatDate(row.getValue("created_at")),
  },
];

function DealSheetsIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dealSheets = [], isLoading } = useQuery<DealSheet[]>({
    queryKey: ["deal-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_sheets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createDealSheet = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheets")
        .insert({ name: "New Deal Sheet", deal_type: "scattered_lot", status: "Draft" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-sheets"] });
      navigate({ to: "/operations/deal-sheets/$dealSheetId", params: { dealSheetId: data.id } });
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deal Sheets</h1>
          <p className="mt-0.5 text-sm text-muted">Standalone deal analysis worksheets</p>
        </div>
        <button
          type="button"
          onClick={() => createDealSheet.mutate()}
          disabled={createDealSheet.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          New Deal Sheet
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <FormSkeleton fields={8} />
      ) : dealSheets.length === 0 ? (
        <EmptyState
          title="No deal sheets yet"
          description="Create a deal sheet to analyze a potential deal outside the pipeline."
          action={
            <button
              type="button"
              onClick={() => createDealSheet.mutate()}
              disabled={createDealSheet.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              New Deal Sheet
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={dealSheets}
          searchKey="name"
          searchPlaceholder="Search deal sheets..."
          onRowClick={(row) =>
            navigate({ to: "/operations/deal-sheets/$dealSheetId", params: { dealSheetId: row.id } })
          }
        />
      )}
    </div>
  );
}
