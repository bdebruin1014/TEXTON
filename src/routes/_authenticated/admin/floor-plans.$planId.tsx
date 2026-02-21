import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/floor-plans/$planId")({
  component: FloorPlanDetail,
});

interface FloorPlan {
  id: string;
  name: string;
  elevation: string | null;
  plan_type: string | null;
  heated_sqft: number | null;
  total_sqft: number | null;
  bed_count: number | null;
  bath_count: number | null;
  stories: number | null;
  garage_bays: number | null;
  garage_type: string | null;
  width_ft: number | null;
  depth_ft: number | null;
  dm_budget_snb: number | null;
  dm_budget_total: number | null;
  contract_snb: number | null;
  contract_total: number | null;
  base_construction_cost: number | null;
  base_sale_price: number | null;
  rendering_url: string | null;
  floorplan_url: string | null;
  status: string;
}

interface SticksBricksItem {
  id: string;
  floor_plan_id: string;
  category: string | null;
  description: string | null;
  amount: number | null;
  sort_order: number;
}

const GARAGE_TYPE_OPTIONS = ["None", "1-Car", "2-Car", "1F", "2F", "1R", "2R"];
const PLAN_TYPE_OPTIONS = ["SFH", "Townhome"];
const STATUS_OPTIONS = ["Active", "Inactive"];

function FloorPlanDetail() {
  const { planId } = Route.useParams();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["floor-plan", planId], [planId]);
  const sbQueryKey = useMemo(() => ["sticks-bricks", planId], [planId]);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: plan, isLoading: planLoading } = useQuery<FloorPlan>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("floor_plans").select("*").eq("id", planId).single();
      if (error) throw error;
      return data as FloorPlan;
    },
  });

  const { data: sbItems = [], isLoading: sbLoading } = useQuery<SticksBricksItem[]>({
    queryKey: sbQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sticks_bricks_items")
        .select("*")
        .eq("floor_plan_id", planId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // -- Auto-save for currency fields --
  const makeOnSave = useCallback(
    (field: string) => async (value: number) => {
      const { error } = await supabase
        .from("floor_plans")
        .update({ [field]: value })
        .eq("id", planId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [planId, queryClient, queryKey],
  );

  // -- Auto-save for text / select fields (with debounce for text) --
  const saveTextField = useCallback(
    (field: string, value: string) => {
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
      }
      debounceTimers.current[field] = setTimeout(async () => {
        const { error } = await supabase
          .from("floor_plans")
          .update({ [field]: value })
          .eq("id", planId);
        if (error) console.error(`Failed to save ${field}:`, error);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [planId, queryClient, queryKey],
  );

  const saveSelectField = useCallback(
    async (field: string, value: string) => {
      const { error } = await supabase
        .from("floor_plans")
        .update({ [field]: value })
        .eq("id", planId);
      if (error) console.error(`Failed to save ${field}:`, error);
      queryClient.invalidateQueries({ queryKey });
    },
    [planId, queryClient, queryKey],
  );

  const saveNumericField = useCallback(
    (field: string, value: string) => {
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
      }
      debounceTimers.current[field] = setTimeout(async () => {
        const num = value === "" ? null : Number(value);
        const { error } = await supabase
          .from("floor_plans")
          .update({ [field]: num })
          .eq("id", planId);
        if (error) console.error(`Failed to save ${field}:`, error);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [planId, queryClient, queryKey],
  );

  // -- S&B mutations --
  const addSbItem = useMutation({
    mutationFn: async () => {
      const nextOrder = sbItems.length > 0 ? Math.max(...sbItems.map((i) => i.sort_order)) + 1 : 1;
      const { error } = await supabase.from("sticks_bricks_items").insert({
        floor_plan_id: planId,
        category: "",
        description: "",
        amount: 0,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sbQueryKey }),
  });

  const deleteSbItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sticks_bricks_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sbQueryKey }),
  });

  const saveSbField = useCallback(
    (id: string, field: string, value: string) => {
      const timerKey = `sb-${id}-${field}`;
      if (debounceTimers.current[timerKey]) {
        clearTimeout(debounceTimers.current[timerKey]);
      }
      debounceTimers.current[timerKey] = setTimeout(async () => {
        const { error } = await supabase
          .from("sticks_bricks_items")
          .update({ [field]: value })
          .eq("id", id);
        if (error) console.error(`Failed to save S&B ${field}:`, error);
        queryClient.invalidateQueries({ queryKey: sbQueryKey });
      }, 800);
    },
    [queryClient, sbQueryKey],
  );

  const makeSbAmountSave = useCallback(
    (id: string) => async (value: number) => {
      const { error } = await supabase.from("sticks_bricks_items").update({ amount: value }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: sbQueryKey });
    },
    [queryClient, sbQueryKey],
  );

  if (planLoading || !plan) {
    return <FormSkeleton />;
  }

  const statusColor = plan.status === "Active" ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground";

  const sbTotal = sbItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/floor-plans"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"\u2190"} Back to Floor Plans
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{plan.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>{plan.status}</span>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Plan Details</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Plan Type */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Plan Type</span>
            <select
              defaultValue={plan.plan_type ?? ""}
              onChange={(e) => saveSelectField("plan_type", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">--</option>
              {PLAN_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Numeric fields */}
          <NumericField label="Heated SQFT" field="heated_sqft" value={plan.heated_sqft} onChange={saveNumericField} />
          <NumericField label="Total SQFT" field="total_sqft" value={plan.total_sqft} onChange={saveNumericField} />
          <NumericField label="Bedrooms" field="bed_count" value={plan.bed_count} onChange={saveNumericField} />
          <NumericField label="Bathrooms" field="bath_count" value={plan.bath_count} onChange={saveNumericField} />
          <NumericField label="Stories" field="stories" value={plan.stories} onChange={saveNumericField} />
          <NumericField label="Garage Bays" field="garage_bays" value={plan.garage_bays} onChange={saveNumericField} />

          {/* Garage Type */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Garage Type</span>
            <select
              defaultValue={plan.garage_type ?? ""}
              onChange={(e) => saveSelectField("garage_type", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">--</option>
              {GARAGE_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <NumericField label="Width (ft)" field="width_ft" value={plan.width_ft} onChange={saveNumericField} />
          <NumericField label="Depth (ft)" field="depth_ft" value={plan.depth_ft} onChange={saveNumericField} />

          {/* Elevation (text) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Elevation</span>
            <input
              type="text"
              defaultValue={plan.elevation ?? ""}
              onChange={(e) => saveTextField("elevation", e.target.value)}
              placeholder="e.g. A, B, C"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Currency fields */}
          <CurrencyInput label="DM Budget S&B" value={plan.dm_budget_snb} onSave={makeOnSave("dm_budget_snb")} />
          <CurrencyInput label="DM Budget Total" value={plan.dm_budget_total} onSave={makeOnSave("dm_budget_total")} />
          <CurrencyInput label="Contract S&B" value={plan.contract_snb} onSave={makeOnSave("contract_snb")} />
          <CurrencyInput label="Contract Total" value={plan.contract_total} onSave={makeOnSave("contract_total")} />
          <CurrencyInput
            label="Base Construction Cost"
            value={plan.base_construction_cost}
            onSave={makeOnSave("base_construction_cost")}
          />
          <CurrencyInput label="Base Sale Price" value={plan.base_sale_price} onSave={makeOnSave("base_sale_price")} />

          {/* URL fields */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Rendering URL</span>
            <input
              type="text"
              defaultValue={plan.rendering_url ?? ""}
              onChange={(e) => saveTextField("rendering_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Floorplan URL</span>
            <input
              type="text"
              defaultValue={plan.floorplan_url ?? ""}
              onChange={(e) => saveTextField("floorplan_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Status</span>
            <select
              defaultValue={plan.status}
              onChange={(e) => saveSelectField("status", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sticks & Bricks Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Sticks &amp; Bricks</h2>
          <button
            type="button"
            onClick={() => addSbItem.mutate()}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Line Item
          </button>
        </div>

        {sbLoading ? (
          <FormSkeleton fields={3} />
        ) : sbItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No line items yet. Click "+ Add Line Item" to begin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Category
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Amount
                  </th>
                  <th className="w-20 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sbItems.map((item) => (
                  <SbRow
                    key={item.id}
                    item={item}
                    onTextChange={saveSbField}
                    makeAmountSave={makeSbAmountSave}
                    onDelete={() => deleteSbItem.mutate(item.id)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-sm font-semibold text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-foreground">{formatCurrency(sbTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Helper components --

function NumericField({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: string;
  value: number | null;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <input
        type="number"
        defaultValue={value ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function SbRow({
  item,
  onTextChange,
  makeAmountSave,
  onDelete,
}: {
  item: SticksBricksItem;
  onTextChange: (id: string, field: string, value: string) => void;
  makeAmountSave: (id: string) => (value: number) => Promise<void>;
  onDelete: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [category, setCategory] = useState(item.category ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = (field: string) => {
    setEditingField(field);
    // Focus is handled via ref + useEffect-like behavior after render
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <tr className="group border-b border-border/50 hover:bg-accent/30">
      {/* Category */}
      <td className="px-3 py-1.5">
        {editingField === "category" ? (
          <input
            ref={inputRef}
            type="text"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              onTextChange(item.id, "category", e.target.value);
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingField(null);
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            className="block w-full cursor-text truncate text-left text-sm text-foreground"
            onClick={() => startEditing("category")}
          >
            {category || <span className="text-muted">Click to edit</span>}
          </button>
        )}
      </td>

      {/* Description */}
      <td className="px-3 py-1.5">
        {editingField === "description" ? (
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              onTextChange(item.id, "description", e.target.value);
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingField(null);
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            className="block w-full cursor-text truncate text-left text-sm text-foreground"
            onClick={() => startEditing("description")}
          >
            {description || <span className="text-muted">Click to edit</span>}
          </button>
        )}
      </td>

      {/* Amount */}
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={item.amount} onSave={makeAmountSave(item.id)} />
      </td>

      {/* Delete */}
      <td className="px-3 py-1.5 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-xs font-medium text-muted transition-colors opacity-0 group-hover:opacity-100 hover:text-destructive"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
