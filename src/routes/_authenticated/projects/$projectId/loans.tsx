import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/loans")({
  component: Loans,
});

function Loans() {
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

  const loanAmount = project.loan_amount ?? 0;
  const loanBalance = project.loan_balance ?? 0;
  const drawn = loanAmount > 0 ? ((loanAmount - (loanAmount - loanBalance)) / loanAmount) * 100 : 0;

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Loan Tracking</h2>

      {/* Loan Summary */}
      {loanAmount > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Loan Summary</h3>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Loan Amount</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(loanAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Current Balance</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(loanBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Available</p>
              <p className="text-sm font-semibold text-success">{formatCurrency(loanAmount - loanBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Drawn</p>
              <p className="text-sm font-semibold text-foreground">{drawn.toFixed(1)}%</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(drawn, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Lender Info */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Lender Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Lender Name"
            value={project.lender_name}
            onSave={save("lender_name")}
            placeholder="Bank / Lender"
          />
          <AutoSaveField
            label="Loan Officer"
            value={project.loan_officer}
            onSave={save("loan_officer")}
            placeholder="Contact name"
          />
          <AutoSaveField
            label="Loan Number"
            value={project.loan_number}
            onSave={save("loan_number")}
            placeholder="Loan #"
          />
          <AutoSaveField
            label="Loan Type"
            value={project.loan_type}
            onSave={save("loan_type")}
            placeholder="Construction, A&D, etc."
          />
        </div>
      </div>

      {/* Loan Terms */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Loan Terms</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Loan Amount" value={project.loan_amount} onSave={save("loan_amount")} />
          <PercentageInput label="Interest Rate" value={project.loan_rate} onSave={save("loan_rate")} />
          <AutoSaveField
            label="Origination Date"
            value={project.loan_origination_date}
            onSave={save("loan_origination_date")}
            type="date"
          />
          <AutoSaveField
            label="Maturity Date"
            value={project.loan_maturity_date}
            onSave={save("loan_maturity_date")}
            type="date"
          />
          <CurrencyInput label="Current Balance" value={project.loan_balance} onSave={save("loan_balance")} />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Loan Notes"
          value={project.loan_notes}
          onSave={save("loan_notes")}
          type="textarea"
          rows={4}
          placeholder="Covenants, conditions, special terms..."
        />
      </div>
    </div>
  );
}
