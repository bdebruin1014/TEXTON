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

export const Route = createFileRoute("/_authenticated/investors/distributions")({
  component: Distributions,
});

interface Distribution {
  id: string;
  distribution_number: string | null;
  fund_name: string | null;
  fund_id: string | null;
  distribution_date: string | null;
  total_amount: number | null;
  distribution_type: string | null;
  waterfall_tier: string | null;
  status: string;
}

function Distributions() {
  const queryClient = useQueryClient();

  const { data: distributions = [], isLoading } = useQuery<Distribution[]>({
    queryKey: ["distributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distributions")
        .select("*")
        .order("distribution_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDistribution = useMutation({
    mutationFn: async () => {
      const count = distributions.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("distributions").insert({
        distribution_number: `DIST-${String(count).padStart(4, "0")}`,
        distribution_date: today,
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["distributions"] }),
  });

  const issueNotice = useMutation({
    mutationFn: async (distId: string) => {
      const { error } = await supabase.from("distributions").update({ status: "Issued" }).eq("id", distId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["distributions"] }),
  });

  const totalDistributed = distributions.reduce((sum, d) => sum + (d.total_amount ?? 0), 0);

  const columns: ColumnDef<Distribution, unknown>[] = [
    {
      accessorKey: "distribution_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dist #" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.getValue("distribution_number") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "fund_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fund" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("fund_name") ?? "—"}</span>,
    },
    {
      accessorKey: "distribution_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const val = row.getValue("distribution_date") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
    {
      accessorKey: "distribution_type",
      header: "Type",
      cell: ({ row }) => {
        const val = row.getValue("distribution_type") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("total_amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "waterfall_tier",
      header: "Waterfall Tier",
      cell: ({ row }) => {
        const val = row.getValue("waterfall_tier") as string | null;
        return val ? <span className="text-xs text-muted">{val}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "Draft" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              issueNotice.mutate(row.original.id);
            }}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
          >
            
            Issue Notice
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Distributions</h1>
          <p className="mt-0.5 text-sm text-muted">
            {distributions.length} distributions · Total: {formatCurrency(totalDistributed)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addDistribution.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          +
          New Distribution
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : distributions.length === 0 ? (
        <EmptyState
          title="No distributions"
          description="Create distributions with waterfall calculations and investor allocations"
        />
      ) : (
        <DataTable
          columns={columns}
          data={distributions}
          searchKey="fund_name"
          searchPlaceholder="Search distributions..."
        />
      )}
    </div>
  );
}
