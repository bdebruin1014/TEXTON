import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { RecordTeamAssignment } from "@/components/teams/RecordTeamAssignment";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/basic-info")({
  component: BasicInfo,
});

interface ProjectFinancials {
  total_budget: number | null;
  total_spent: number | null;
  total_revenue: number | null;
  total_profit: number | null;
  loan_balance: number | null;
  equity_invested: number | null;
}

function SummaryCard({ financials }: { financials: ProjectFinancials }) {
  const budget = financials.total_budget ?? 0;
  const spent = financials.total_spent ?? 0;
  const revenue = financials.total_revenue ?? 0;
  const profit = financials.total_profit ?? 0;
  const remaining = budget - spent;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const items = [
    { label: "Total Budget", value: formatCurrency(budget) },
    { label: "Total Spent", value: formatCurrency(spent) },
    { label: "Remaining", value: formatCurrency(remaining) },
    { label: "Revenue", value: formatCurrency(revenue) },
    { label: "Profit", value: formatCurrency(profit) },
    { label: "Margin", value: `${margin.toFixed(1)}%` },
    { label: "Loan Balance", value: formatCurrency(financials.loan_balance ?? 0) },
    { label: "Equity Invested", value: formatCurrency(financials.equity_invested ?? 0) },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Summary Financials</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted">{item.label}</p>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BasicInfo() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!project) {
    return <div className="py-12 text-center text-sm text-muted">Project not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Basic Info</h2>

      {/* Summary Financials Card (always visible) */}
      <div className="mb-8">
        <SummaryCard
          financials={{
            total_budget: project.total_budget,
            total_spent: project.total_spent,
            total_revenue: project.total_revenue,
            total_profit: project.total_profit,
            loan_balance: project.loan_balance,
            equity_invested: project.equity_invested,
          }}
        />
      </div>

      {/* Project Identity */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Project Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Project Name" value={project.project_name} onSave={save("project_name")} required />
          <StatusSelect label="Status" value={project.status} onSave={save("status")} statuses={PROJECT_STATUSES} required />
          <AutoSaveSelect
            label="Project Type"
            value={project.project_type}
            onSave={save("project_type")}
            options={PROJECT_TYPES}
            placeholder="Select type..."
            required
          />
          <AutoSaveField
            label="Entity"
            value={project.entity_name}
            onSave={save("entity_name")}
            placeholder="Entity name..."
          />
        </div>
      </div>

      {/* Financials */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Budget Overview</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Total Budget" value={project.total_budget} onSave={save("total_budget")} />
          <AutoSaveField
            label="Total Lots"
            value={project.total_lots}
            onSave={save("total_lots")}
            type="number"
            placeholder="Number of lots"
          />
        </div>
      </div>

      {/* Team & Assignments */}
      <div className="mb-8">
        <RecordTeamAssignment recordType="project" recordId={projectId} />
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Description"
          value={project.description}
          onSave={save("description")}
          type="textarea"
          rows={4}
          placeholder="Describe this project..."
        />
      </div>
    </div>
  );
}
