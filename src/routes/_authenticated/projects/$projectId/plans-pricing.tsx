import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useAutoSave, type SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/_authenticated/projects/$projectId/plans-pricing")({
  component: PlansPricing,
});

interface FloorPlan {
  id: string;
  name: string;
  bed_count: number | null;
  bath_count: number | null;
  heated_sqft: number | null;
  base_sale_price: number | null;
  base_construction_cost: number | null;
}

/* ─── Inline currency cell with auto-save ─── */

function InlineCurrencyCell({
  planId,
  field,
  value,
  projectId,
}: {
  planId: string;
  field: "base_sale_price" | "base_construction_cost";
  value: number | null;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [displayValue, setDisplayValue] = useState(formatForDisplay(value));
  const [numericValue, setNumericValue] = useState(value ?? 0);
  const initialRef = useRef(value);

  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
    setNumericValue(value ?? 0);
    initialRef.current = value;
  }, [value]);

  const saveFn = useCallback(
    async (v: number) => {
      if (v === (initialRef.current ?? 0)) return;
      const { error } = await supabase
        .from("floor_plans")
        .update({ [field]: v })
        .eq("id", planId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] });
    },
    [planId, field, projectId, queryClient],
  );

  const { status } = useAutoSave(numericValue, saveFn);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const num = Number.parseFloat(cleaned);
    setNumericValue(Number.isNaN(num) ? 0 : num);
  };

  const handleBlur = () => {
    setDisplayValue(formatForDisplay(numericValue));
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-28 rounded border border-border bg-background py-1 pl-5 pr-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      <StatusDot status={status} />
    </div>
  );
}

function StatusDot({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const dotColor =
    status === "saving"
      ? "bg-warning animate-pulse"
      : status === "saved"
        ? "bg-success"
        : "bg-destructive";
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} title={status} />;
}

function formatForDisplay(val: number | null | undefined): string {
  if (val == null || val === 0) return "";
  return val.toLocaleString("en-US");
}

/* ─── Main component ─── */

function PlansPricing() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Check user role for edit guard
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });

  const canEdit = userRole === "admin" || userRole === "software_admin";

  const { data: plans = [], isLoading } = useQuery<FloorPlan[]>({
    queryKey: ["floor-plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("floor_plans").insert({
        project_id: projectId,
        name: "New Plan",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] }),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("floor_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] }),
  });

  const avgPrice = plans.length > 0 ? plans.reduce((sum, p) => sum + (p.base_sale_price ?? 0), 0) / plans.length : 0;

  const columns: ColumnDef<FloorPlan, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "bed_count",
      header: "Beds",
    },
    {
      accessorKey: "bath_count",
      header: "Baths",
    },
    {
      accessorKey: "heated_sqft",
      header: "Heated SF",
      cell: ({ row }) => {
        const val = row.getValue("heated_sqft") as number | null;
        return val ? `${val.toLocaleString()}` : "\u2014";
      },
    },
    {
      accessorKey: "base_sale_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => {
        if (isEditing) {
          return (
            <InlineCurrencyCell
              planId={row.original.id}
              field="base_sale_price"
              value={row.original.base_sale_price}
              projectId={projectId}
            />
          );
        }
        const val = row.getValue("base_sale_price") as number | null;
        return val ? formatCurrency(val) : "\u2014";
      },
    },
    {
      accessorKey: "base_construction_cost",
      header: "Build Cost",
      cell: ({ row }) => {
        if (isEditing) {
          return (
            <InlineCurrencyCell
              planId={row.original.id}
              field="base_construction_cost"
              value={row.original.base_construction_cost}
              projectId={projectId}
            />
          );
        }
        const val = row.getValue("base_construction_cost") as number | null;
        return val ? formatCurrency(val) : "\u2014";
      },
    },
    {
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const price = row.original.base_sale_price;
        const cost = row.original.base_construction_cost;
        if (!price || !cost) return "\u2014";
        const margin = ((price - cost) / price) * 100;
        return `${margin.toFixed(1)}%`;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePlan.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        ></button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Home Plans & Pricing</h2>
          {plans.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {plans.length} plans · Avg {formatCurrency(avgPrice)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                isEditing
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-border bg-transparent text-foreground hover:bg-primary-50",
              )}
            >
              {isEditing ? "Done Editing" : "Edit Pricing"}
            </button>
          )}
          <button
            type="button"
            onClick={() => addPlan.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState title="No floor plans" description="Add floor plans to define your product mix and pricing" />
      ) : (
        <DataTable columns={columns} data={plans} searchKey="name" searchPlaceholder="Search plans..." />
      )}
    </div>
  );
}
