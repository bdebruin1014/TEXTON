import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { computeBuilderFee, computeContingency, FIXED_PER_HOUSE_FEES, totalFixedPerHouse } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/budget")({
  component: ContractBudget,
});

interface BudgetSection {
  label: string;
  amount: number;
  description: string;
}

function ContractBudget() {
  const { contractId } = Route.useParams();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["rch-contract", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contracts").select("*").eq("id", contractId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["rch-contract-units", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contract_units").select("*").eq("contract_id", contractId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: upgrades = [] } = useQuery({
    queryKey: ["rch-contract-upgrades", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contract_upgrades").select("*").eq("contract_id", contractId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lotConditions = [] } = useQuery({
    queryKey: ["rch-contract-lot-conditions", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_lot_conditions")
        .select("*")
        .eq("contract_id", contractId);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  const unitCount = units.length || (contract.unit_count ?? 0);
  const upgradeCostTotal = upgrades.reduce((sum: number, u: { cost?: number | null }) => sum + (u.cost ?? 0), 0);
  const siteSpecificTotal = lotConditions.reduce(
    (sum: number, c: { site_specific_cost?: number | null }) => sum + (c.site_specific_cost ?? 0),
    0,
  );

  // Placeholder base cost per house - would come from Sterling or deal sheet in production
  const baseCostPerHouse = contract.contract_amount && unitCount > 0 ? contract.contract_amount / unitCount : 0;

  // Build 7 budget sections
  const section1to5Subtotal = baseCostPerHouse * unitCount + upgradeCostTotal + siteSpecificTotal;
  const builderFee = computeBuilderFee(section1to5Subtotal);
  const contingency = computeContingency(section1to5Subtotal);
  const fixedPerHouse = totalFixedPerHouse(true); // Assume RCH-related
  const fixedTotal = fixedPerHouse * unitCount;

  const sections: BudgetSection[] = [
    {
      label: "Section 1: Base Construction",
      amount: baseCostPerHouse * unitCount,
      description: `Base cost across ${unitCount} unit(s)`,
    },
    {
      label: "Section 2: Upgrades",
      amount: upgradeCostTotal,
      description: `${upgrades.length} upgrade item(s)`,
    },
    {
      label: "Section 3: Site-Specific Costs",
      amount: siteSpecificTotal,
      description: `${lotConditions.length} lot condition report(s)`,
    },
    {
      label: "Section 4: Permits & Fees",
      amount: 0,
      description: "Included in base or entered separately",
    },
    {
      label: "Section 5: Soft Costs",
      amount: 0,
      description: "Architecture, engineering, etc.",
    },
    {
      label: "Section 6: Builder Fee",
      amount: builderFee,
      description: "Greater of $25K or 10% of Sections 1-5",
    },
    {
      label: "Section 7: Contingency",
      amount: contingency,
      description: "Greater of $10K or 5% of Sections 1-5",
    },
  ];

  const grandTotal = sections.reduce((sum, s) => sum + s.amount, 0) + fixedTotal;

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Budget Summary</h2>
      <p className="mb-6 text-sm text-muted">
        Auto-assembled budget based on contract units, upgrades, lot conditions, and standard fee schedules. This view
        is read-only.
      </p>

      {/* Budget sections */}
      <div className="mb-6 space-y-2">
        {sections.map((section) => (
          <div
            key={section.label}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="text-xs text-muted">{section.description}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(section.amount)}</p>
          </div>
        ))}
      </div>

      {/* Fixed Per-House Fees */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Fixed Per-House Fees ({unitCount} unit{unitCount !== 1 ? "s" : ""})
        </h3>
        <div className="space-y-2">
          {Object.entries(FIXED_PER_HOUSE_FEES).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted">{key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
              <span className="text-foreground">
                {formatCurrency(val)} x {unitCount} = {formatCurrency(val * unitCount)}
              </span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span className="text-foreground">Fixed Fee Subtotal</span>
            <span className="text-foreground">{formatCurrency(fixedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Grand Total */}
      <div className="rounded-lg border-2 border-primary bg-primary/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-foreground">Grand Total</p>
          <p className="text-lg font-medium text-primary">{formatCurrency(grandTotal)}</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          Sections 1-7 ({formatCurrency(grandTotal - fixedTotal)}) + Fixed Per-House ({formatCurrency(fixedTotal)})
        </p>
      </div>
    </div>
  );
}
