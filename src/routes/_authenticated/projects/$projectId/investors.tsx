import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/investors")({
  component: Investors,
});

interface InvestorLink {
  id: string;
  investor_name: string | null;
  entity_name: string | null;
  investment_amount: number | null;
  ownership_pct: number | null;
  preferred_return: number | null;
  distributions_paid: number | null;
}

function Investors() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const projectMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const saveProject = (field: string) => async (value: string | number) => {
    await projectMutation.mutateAsync({ [field]: value });
  };

  const { data: investors = [], isLoading } = useQuery<InvestorLink[]>({
    queryKey: ["project-investors", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_investors")
        .select("*")
        .eq("project_id", projectId)
        .order("investment_amount", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addInvestor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_investors").insert({
        project_id: projectId,
        investor_name: "New Investor",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-investors", projectId] }),
  });

  const totalInvested = investors.reduce((sum, i) => sum + (i.investment_amount ?? 0), 0);
  const totalDistributed = investors.reduce((sum, i) => sum + (i.distributions_paid ?? 0), 0);

  const columns: ColumnDef<InvestorLink, unknown>[] = [
    {
      accessorKey: "investor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Investor" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("investor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "entity_name",
      header: "Entity",
      cell: ({ row }) => <span className="text-muted">{row.getValue("entity_name") ?? "—"}</span>,
    },
    {
      accessorKey: "investment_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invested" />,
      cell: ({ row }) => {
        const val = row.getValue("investment_amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "ownership_pct",
      header: "Ownership %",
      cell: ({ row }) => {
        const val = row.getValue("ownership_pct") as number | null;
        return val != null ? `${(val * 100).toFixed(1)}%` : "—";
      },
    },
    {
      accessorKey: "preferred_return",
      header: "Pref Return",
      cell: ({ row }) => {
        const val = row.getValue("preferred_return") as number | null;
        return val != null ? `${(val * 100).toFixed(1)}%` : "—";
      },
    },
    {
      accessorKey: "distributions_paid",
      header: "Distributions",
      cell: ({ row }) => {
        const val = row.getValue("distributions_paid") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Investor / Entity</h2>

      {/* Entity / Capital Stack overview */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Entity & Capital Stack</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Entity Name"
            value={project?.entity_name}
            onSave={saveProject("entity_name")}
            placeholder="Entity name..."
          />
          <CurrencyInput
            label="Equity Invested"
            value={project?.equity_invested}
            onSave={saveProject("equity_invested")}
          />
          <PercentageInput label="Target IRR" value={project?.target_irr} onSave={saveProject("target_irr")} />
          <PercentageInput
            label="Preferred Return"
            value={project?.preferred_return}
            onSave={saveProject("preferred_return")}
          />
        </div>
      </div>

      {/* Capital Stack Visual */}
      {(totalInvested > 0 || (project?.loan_balance ?? 0) > 0) && (
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Capital Stack</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Total Equity</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Total Debt</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(project?.loan_balance ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Total Capital</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalInvested + (project?.loan_balance ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Distributions Paid</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(totalDistributed)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Investor Table */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Investors</h3>
        <button
          type="button"
          onClick={() => addInvestor.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          Link Investor
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : investors.length === 0 ? (
        <EmptyState title="No investors linked" description="Link investors or fund entities to this project" />
      ) : (
        <DataTable
          columns={columns}
          data={investors}
          searchKey="investor_name"
          searchPlaceholder="Search investors..."
        />
      )}
    </div>
  );
}
