import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/plan-catalog")({
  component: PlanCatalog,
});

interface PlanCatalogEntry {
  id: string;
  project_id: string;
  floor_plan_id: string | null;
  floor_plan_name: string;
  base_price: number | null;
  is_active: boolean;
  sort_order: number | null;
}

interface ElevationOption {
  id: string;
  plan_catalog_id: string;
  elevation_name: string;
  price_adjustment: number | null;
}

interface UpgradePackage {
  id: string;
  project_id: string;
  category: string | null;
  name: string;
  price: number | null;
}

function PlanCatalog() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  // ── Plan Catalog Query ──
  const { data: plans = [], isLoading: plansLoading } = useQuery<PlanCatalogEntry[]>({
    queryKey: ["plan-catalog", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plan_catalog")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Elevation Options Query ──
  const { data: elevations = [], isLoading: elevationsLoading } = useQuery<ElevationOption[]>({
    queryKey: ["elevation-options", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_elevation_options")
        .select("*")
        .eq("project_id", projectId)
        .order("elevation_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Upgrade Catalog Query ──
  const { data: upgrades = [], isLoading: upgradesLoading } = useQuery<UpgradePackage[]>({
    queryKey: ["upgrade-catalog", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_upgrade_catalog")
        .select("*")
        .eq("project_id", projectId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Add Plan Mutation ──
  const addPlan = useMutation({
    mutationFn: async () => {
      const nextSort = plans.length > 0 ? Math.max(...plans.map((p) => p.sort_order ?? 0)) + 1 : 1;
      const { error } = await supabase.from("project_plan_catalog").insert({
        project_id: projectId,
        floor_plan_name: "New Plan",
        is_active: true,
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-catalog", projectId] }),
  });

  // ── Delete Plan Mutation ──
  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_plan_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-catalog", projectId] }),
  });

  // ── Add Elevation Mutation ──
  const addElevation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_elevation_options").insert({
        project_id: projectId,
        plan_catalog_id: plans[0]?.id ?? null,
        elevation_name: "New Elevation",
        price_adjustment: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["elevation-options", projectId] }),
  });

  // ── Delete Elevation Mutation ──
  const deleteElevation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_elevation_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["elevation-options", projectId] }),
  });

  // ── Add Upgrade Mutation ──
  const addUpgrade = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_upgrade_catalog").insert({
        project_id: projectId,
        category: "General",
        name: "New Upgrade",
        price: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upgrade-catalog", projectId] }),
  });

  // ── Delete Upgrade Mutation ──
  const deleteUpgrade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_upgrade_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upgrade-catalog", projectId] }),
  });

  // ── Plan Catalog Columns ──
  const planColumns: ColumnDef<PlanCatalogEntry, unknown>[] = [
    {
      accessorKey: "floor_plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Floor Plan" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("floor_plan_name")}</span>,
    },
    {
      accessorKey: "base_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => {
        const val = row.getValue("base_price") as number | null;
        return val != null ? formatCurrency(val) : "\u2014";
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      accessorKey: "sort_order",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sort Order" />,
      cell: ({ row }) => {
        const val = row.getValue("sort_order") as number | null;
        return val ?? "\u2014";
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
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      {/* ── Section 1: Plan Catalog ── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Plan Catalog</h2>
            {plans.length > 0 && (
              <p className="mt-0.5 text-sm text-muted">
                {plans.length} plan{plans.length !== 1 ? "s" : ""} configured
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addPlan.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Add Plan
          </button>
        </div>

        {plansLoading ? (
          <FormSkeleton />
        ) : plans.length === 0 ? (
          <EmptyState
            title="No plans in catalog"
            description="Add floor plans to this community project's plan catalog"
          />
        ) : (
          <DataTable
            columns={planColumns}
            data={plans}
            searchKey="floor_plan_name"
            searchPlaceholder="Search plans..."
          />
        )}
      </div>

      {/* ── Section 2: Elevation Options ── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Elevation Options</h2>
            {elevations.length > 0 && (
              <p className="mt-0.5 text-sm text-muted">
                {elevations.length} elevation{elevations.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addElevation.mutate()}
            disabled={plans.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Elevation
          </button>
        </div>

        {elevationsLoading ? (
          <FormSkeleton />
        ) : elevations.length === 0 ? (
          <EmptyState
            title="No elevation options"
            description="Add elevation options for the plans in this catalog"
          />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Elevation Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Plan Catalog ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Price Adjustment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted" />
                </tr>
              </thead>
              <tbody>
                {elevations.map((elev) => (
                  <tr key={elev.id} className="border-b border-border last:border-0 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{elev.elevation_name}</td>
                    <td className="px-4 py-3 text-muted">{elev.plan_catalog_id ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-foreground">
                      {elev.price_adjustment != null ? formatCurrency(elev.price_adjustment) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteElevation.mutate(elev.id)}
                        className="rounded p-1 text-muted transition-colors hover:text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Upgrade Packages ── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Upgrade Packages</h2>
            {upgrades.length > 0 && (
              <p className="mt-0.5 text-sm text-muted">
                {upgrades.length} upgrade{upgrades.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addUpgrade.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Add Upgrade
          </button>
        </div>

        {upgradesLoading ? (
          <FormSkeleton />
        ) : upgrades.length === 0 ? (
          <EmptyState
            title="No upgrade packages"
            description="Add upgrade packages available for this community project"
          />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted" />
                </tr>
              </thead>
              <tbody>
                {upgrades.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border last:border-0 transition-colors">
                    <td className="px-4 py-3 text-muted">{pkg.category ?? "\u2014"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                    <td className="px-4 py-3 text-foreground">
                      {pkg.price != null ? formatCurrency(pkg.price) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteUpgrade.mutate(pkg.id)}
                        className="rounded p-1 text-muted transition-colors hover:text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
