import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent, getErrorMessage } from "@/lib/utils";

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
  is_gp: boolean;
  contribution_date: string | null;
  status: string;
}

interface WaterfallTier {
  id: string;
  fund_id: string;
  tier_order: number;
  tier_name: string;
  description: string | null;
  pref_rate: number | null;
  catch_up_pct: number | null;
  gp_split_pct: number | null;
  lp_split_pct: number | null;
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

  const { data: waterfallTiers = [] } = useQuery<WaterfallTier[]>({
    queryKey: ["waterfall-tiers", fundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waterfall_tiers")
        .select("*")
        .eq("fund_id", fundId)
        .order("tier_order");
      if (error) throw error;
      return data ?? [];
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

  const updateInvestment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("investments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-investors", fundId] });
    },
  });

  const addDefaultTiers = useMutation({
    mutationFn: async () => {
      const prefRate = fund?.preferred_return ?? 0.08;
      const tiers = [
        { fund_id: fundId, tier_order: 1, tier_name: "return_of_capital", description: "Return of Capital" },
        {
          fund_id: fundId,
          tier_order: 2,
          tier_name: "preferred_return",
          description: "Preferred Return",
          pref_rate: prefRate,
        },
        { fund_id: fundId, tier_order: 3, tier_name: "catch_up", description: "GP Catch-Up", catch_up_pct: 0.2 },
        {
          fund_id: fundId,
          tier_order: 4,
          tier_name: "profit_split",
          description: "Profit Split",
          gp_split_pct: 0.2,
          lp_split_pct: 0.8,
        },
      ];
      const { error } = await supabase.from("waterfall_tiers").insert(tiers);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterfall-tiers", fundId] });
      toast.success("Default waterfall tiers added");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to add tiers — they may already exist"),
  });

  const updateTier = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("waterfall_tiers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterfall-tiers", fundId] });
    },
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("waterfall_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterfall-tiers", fundId] });
      toast.success("Tier removed");
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
      accessorKey: "is_gp",
      header: "GP/LP",
      cell: ({ row }) => {
        const isGp = row.original.is_gp;
        return (
          <button
            type="button"
            onClick={() => updateInvestment.mutate({ id: row.original.id, updates: { is_gp: !isGp } })}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isGp ? "bg-info-bg text-info-text" : "bg-accent text-muted-foreground"
            }`}
          >
            {isGp ? "GP" : "LP"}
          </button>
        );
      },
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
      accessorKey: "contribution_date",
      header: "Contribution Date",
      cell: ({ row }) => {
        const val = row.original.contribution_date;
        return val ? <span className="text-xs">{val}</span> : <span className="text-xs text-muted">—</span>;
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
      {/* Header */}
      <div className="mb-6">
        <Link to="/investors" className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline">
          {"\u2190"}
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

      {/* Waterfall Configuration */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Waterfall Tiers</h2>
          {waterfallTiers.length === 0 && (
            <button
              type="button"
              onClick={() => addDefaultTiers.mutate()}
              disabled={addDefaultTiers.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              + Add Default Tiers
            </button>
          )}
        </div>
        {waterfallTiers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            No waterfall tiers configured. Add default tiers to enable distribution calculations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Pref Rate</th>
                  <th className="px-3 py-2">Catch-Up %</th>
                  <th className="px-3 py-2">GP Split</th>
                  <th className="px-3 py-2">LP Split</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {waterfallTiers.map((tier) => (
                  <WaterfallTierRow
                    key={tier.id}
                    tier={tier}
                    onUpdate={(updates) => updateTier.mutate({ id: tier.id, updates })}
                    onDelete={() => deleteTier.mutate(tier.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investors Sub-table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Investors ({investors.length})</h2>
          <button
            type="button"
            onClick={() => addInvestor.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Investor
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

// ---------------------------------------------------------------------------
// Waterfall tier inline-editable row
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<string, string> = {
  return_of_capital: "Return of Capital",
  preferred_return: "Preferred Return",
  catch_up: "GP Catch-Up",
  profit_split: "Profit Split",
};

function WaterfallTierRow({
  tier,
  onUpdate,
  onDelete,
}: {
  tier: WaterfallTier;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const pctCell = (field: string, value: number | null) => {
    const display = value != null ? `${(value * 100).toFixed(1)}%` : "—";
    return (
      <td className="px-3 py-2">
        {editing === field ? (
          <input
            type="number"
            step="0.1"
            className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
            defaultValue={value != null ? (value * 100).toFixed(1) : ""}
            autoFocus
            onBlur={(e) => {
              const v = e.target.value ? Number(e.target.value) / 100 : null;
              onUpdate({ [field]: v });
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(null);
            }}
          />
        ) : (
          <button type="button" className="text-xs hover:underline" onClick={() => setEditing(field)}>
            {display}
          </button>
        )}
      </td>
    );
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-mono text-xs">{tier.tier_order}</td>
      <td className="px-3 py-2 text-xs font-medium">{TIER_LABELS[tier.tier_name] ?? tier.tier_name}</td>
      <td className="px-3 py-2 text-xs text-muted">{tier.description ?? "—"}</td>
      {pctCell("pref_rate", tier.pref_rate)}
      {pctCell("catch_up_pct", tier.catch_up_pct)}
      {pctCell("gp_split_pct", tier.gp_split_pct)}
      {pctCell("lp_split_pct", tier.lp_split_pct)}
      <td className="px-3 py-2">
        <button
          type="button"
          className="text-xs text-destructive hover:underline"
          onClick={() => {
            if (window.confirm("Remove this tier?")) onDelete();
          }}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
