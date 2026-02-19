import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Plus } from "lucide-react";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investors/$fundId")({
  component: FundDetail,
});

interface Fund {
  id: string;
  name: string;
  entity_name: string | null;
  fund_type: string | null;
  vintage_year: number | null;
  total_committed: number | null;
  total_called: number | null;
  total_deployed: number | null;
  total_distributed: number | null;
  preferred_return: number | null;
  promote_structure: string | null;
  description: string | null;
  status: string;
}

interface Investor {
  id: string;
  investor_name: string | null;
  commitment_amount: number | null;
  called_amount: number | null;
  distributed_amount: number | null;
  ownership_pct: number | null;
  status: string;
}

const FUND_TYPES = ["Equity Fund", "Debt Fund", "Opportunity Fund", "Development Fund", "Joint Venture"];

function FundDetail() {
  const { fundId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: fund, isLoading } = useQuery<Fund>({
    queryKey: ["fund", fundId],
    queryFn: async () => {
      const { data, error } = await supabase.from("funds").select("*").eq("id", fundId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["fund-investors", fundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("fund_id", fundId)
        .order("investor_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("funds").update(updates).eq("id", fundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund", fundId] });
    },
  });

  const addInvestor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("investments").insert({
        fund_id: fundId,
        investor_name: "New Investor",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-investors", fundId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!fund) {
    return <EmptyState title="Fund not found" description="This fund may have been removed" />;
  }

  const investorColumns: ColumnDef<Investor, unknown>[] = [
    {
      accessorKey: "investor_name",
      header: "Investor",
      cell: ({ row }) => <span className="font-medium">{row.getValue("investor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "commitment_amount",
      header: "Commitment",
      cell: ({ row }) => {
        const val = row.getValue("commitment_amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "called_amount",
      header: "Called",
      cell: ({ row }) => {
        const val = row.getValue("called_amount") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "distributed_amount",
      header: "Distributed",
      cell: ({ row }) => {
        const val = row.getValue("distributed_amount") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "ownership_pct",
      header: "Ownership %",
      cell: ({ row }) => {
        const val = row.getValue("ownership_pct") as number | null;
        return val != null ? formatPercent(val) : "—";
      },
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
      {/* Header */}
      <div className="mb-6">
        <Link to="/investors" className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Funds
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{fund.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {fund.fund_type ?? "Fund"} · {fund.vintage_year ?? "—"}
        </p>
      </div>

      {/* Fund Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Fund Information</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <AutoSaveField label="Fund Name" value={fund.name} onSave={save("name")} />
          <AutoSaveSelect
            label="Fund Type"
            value={fund.fund_type ?? ""}
            options={FUND_TYPES.map((t) => ({ label: t, value: t }))}
            onSave={save("fund_type")}
          />
          <AutoSaveField label="Entity" value={fund.entity_name ?? ""} onSave={save("entity_name")} />
          <AutoSaveField
            label="Vintage Year"
            value={fund.vintage_year ?? ""}
            onSave={save("vintage_year")}
            type="number"
          />
          <AutoSaveSelect
            label="Status"
            value={fund.status}
            options={["Active", "Closed", "Fully Deployed", "Winding Down"]}
            onSave={save("status")}
          />
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financial Summary</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <CurrencyInput label="Total Committed" value={fund.total_committed ?? 0} onSave={save("total_committed")} />
          <CurrencyInput label="Total Called" value={fund.total_called ?? 0} onSave={save("total_called")} />
          <CurrencyInput label="Total Deployed" value={fund.total_deployed ?? 0} onSave={save("total_deployed")} />
          <CurrencyInput
            label="Total Distributed"
            value={fund.total_distributed ?? 0}
            onSave={save("total_distributed")}
          />
          <PercentageInput
            label="Preferred Return"
            value={fund.preferred_return ?? 0}
            onSave={save("preferred_return")}
          />
          <AutoSaveField
            label="Promote Structure"
            value={fund.promote_structure ?? ""}
            onSave={save("promote_structure")}
          />
        </div>
      </div>

      {/* Description */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Description</h2>
        <AutoSaveField label="" value={fund.description ?? ""} onSave={save("description")} type="textarea" rows={4} />
      </div>

      {/* Investors Sub-table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Investors ({investors.length})</h2>
          <button
            type="button"
            onClick={() => addInvestor.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Investor
          </button>
        </div>
        {investors.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No investors yet</p>
        ) : (
          <DataTable
            columns={investorColumns}
            data={investors}
            searchKey="investor_name"
            searchPlaceholder="Search investors..."
          />
        )}
      </div>
    </div>
  );
}
