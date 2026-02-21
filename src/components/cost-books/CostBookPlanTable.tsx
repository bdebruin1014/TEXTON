import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { type CostBookPlan, useCostBookPlans } from "@/hooks/useCostBooks";
import { supabase } from "@/lib/supabase";

interface CostBookPlanTableProps {
  bookId: string;
  onViewLineItems: (planId: string, planName: string) => void;
}

export function CostBookPlanTable({ bookId, onViewLineItems }: CostBookPlanTableProps) {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useCostBookPlans(bookId);
  const queryKey = useMemo(() => ["cost-book-plans", bookId], [bookId]);

  const makeOnSave = useCallback(
    (planRowId: string, field: string) => async (value: number) => {
      const { error } = await supabase
        .from("cost_book_plans")
        .update({ [field]: value })
        .eq("id", planRowId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey],
  );

  if (isLoading) {
    return <p className="py-4 text-center text-sm text-muted">Loading plans...</p>;
  }

  if (plans.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No plans in this cost book yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Plan</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">SF</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Contract S&B
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              DM Budget S&B
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              DM Budget Total
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Contract Total
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Build Cost
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">$/SF</th>
            <th className="w-20 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} makeOnSave={makeOnSave} onViewLineItems={onViewLineItems} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanRow({
  plan,
  makeOnSave,
  onViewLineItems,
}: {
  plan: CostBookPlan;
  makeOnSave: (id: string, field: string) => (value: number) => Promise<void>;
  onViewLineItems: (planId: string, planName: string) => void;
}) {
  const planName = plan.floor_plans?.name ?? "Unknown";
  const sf = plan.floor_plans?.heated_sqft;

  return (
    <tr className="group border-b border-border/50 hover:bg-accent/30">
      <td className="px-3 py-1.5 text-sm font-medium text-foreground">{planName}</td>
      <td className="px-3 py-1.5 text-sm text-muted">{sf ? sf.toLocaleString() : "—"}</td>
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={plan.contract_snb} onSave={makeOnSave(plan.id, "contract_snb")} />
      </td>
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={plan.dm_budget_snb} onSave={makeOnSave(plan.id, "dm_budget_snb")} />
      </td>
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={plan.dm_budget_total} onSave={makeOnSave(plan.id, "dm_budget_total")} />
      </td>
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={plan.contract_total} onSave={makeOnSave(plan.id, "contract_total")} />
      </td>
      <td className="px-3 py-1.5">
        <CurrencyInput
          label=""
          value={plan.base_construction_cost}
          onSave={makeOnSave(plan.id, "base_construction_cost")}
        />
      </td>
      <td className="px-3 py-1.5 text-sm text-muted">
        {plan.cost_per_sf != null ? `$${Math.round(plan.cost_per_sf)}` : "—"}
      </td>
      <td className="px-3 py-1.5 text-right">
        <button
          type="button"
          onClick={() => onViewLineItems(plan.floor_plan_id, planName)}
          className="rounded px-2 py-1 text-xs font-medium text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
        >
          Line Items
        </button>
      </td>
    </tr>
  );
}
