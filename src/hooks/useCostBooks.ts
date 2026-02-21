import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CostBook {
  id: string;
  name: string;
  description: string | null;
  effective_date: string | null;
  status: string;
  is_default: boolean;
  source_book_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostBookPlan {
  id: string;
  cost_book_id: string;
  floor_plan_id: string;
  contract_snb: number | null;
  dm_budget_snb: number | null;
  dm_budget_total: number | null;
  contract_total: number | null;
  base_construction_cost: number | null;
  cost_per_sf: number | null;
  floor_plans?: { name: string; heated_sqft: number | null };
}

export interface CostBookLineItem {
  id: string;
  cost_book_id: string;
  floor_plan_id: string;
  category: string | null;
  description: string | null;
  amount: number | null;
  sort_order: number;
}

export interface CostBookUpgrade {
  id: string;
  cost_book_id: string;
  upgrade_package_id: string;
  amount: number | null;
  upgrade_packages?: { name: string; category: string };
}

export interface CostBookSiteWork {
  id: string;
  cost_book_id: string;
  site_work_item_id: string;
  amount: number | null;
  site_work_items?: { code: string; description: string };
}

export interface CostBookFees {
  id: string;
  cost_book_id: string;
  builder_fee: number | null;
  am_fee: number | null;
  builder_warranty: number | null;
  builders_risk: number | null;
  po_fee: number | null;
  bookkeeping: number | null;
  pm_fee: number | null;
  utilities: number | null;
}

// -- List all cost books --
export function useCostBooks() {
  return useQuery<CostBook[]>({
    queryKey: ["cost-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_books")
        .select("*")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -- Single cost book --
export function useCostBook(bookId: string) {
  return useQuery<CostBook>({
    queryKey: ["cost-book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_books").select("*").eq("id", bookId).single();
      if (error) throw error;
      return data as CostBook;
    },
  });
}

// -- Plans for a cost book --
export function useCostBookPlans(bookId: string) {
  return useQuery<CostBookPlan[]>({
    queryKey: ["cost-book-plans", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_book_plans")
        .select("*, floor_plans(name, heated_sqft)")
        .eq("cost_book_id", bookId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -- Line items for a cost book + plan --
export function useCostBookLineItems(bookId: string, planId: string) {
  return useQuery<CostBookLineItem[]>({
    queryKey: ["cost-book-line-items", bookId, planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_book_line_items")
        .select("*")
        .eq("cost_book_id", bookId)
        .eq("floor_plan_id", planId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!planId,
  });
}

// -- Upgrades for a cost book --
export function useCostBookUpgrades(bookId: string) {
  return useQuery<CostBookUpgrade[]>({
    queryKey: ["cost-book-upgrades", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_book_upgrades")
        .select("*, upgrade_packages(name, category)")
        .eq("cost_book_id", bookId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -- Site work for a cost book --
export function useCostBookSiteWork(bookId: string) {
  return useQuery<CostBookSiteWork[]>({
    queryKey: ["cost-book-site-work", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_book_site_work")
        .select("*, site_work_items(code, description)")
        .eq("cost_book_id", bookId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -- Fees for a cost book --
export function useCostBookFees(bookId: string) {
  return useQuery<CostBookFees | null>({
    queryKey: ["cost-book-fees", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_book_fees")
        .select("*")
        .eq("cost_book_id", bookId)
        .maybeSingle();
      if (error) throw error;
      return data as CostBookFees | null;
    },
  });
}

// -- Clone mutation --
export function useCloneCostBook() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { sourceId: string; name: string; effectiveDate?: string }>({
    mutationFn: async ({ sourceId, name, effectiveDate }) => {
      const { data, error } = await supabase.rpc("clone_cost_book", {
        source_id: sourceId,
        new_name: name,
        new_effective_date: effectiveDate ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-books"] });
    },
  });
}

// -- Lookup a plan's cost from a specific cost book (for deal sheet) --
export function useCostBookPlanLookup(bookId: string | null | undefined, planId: string | null | undefined) {
  return useQuery<CostBookPlan | null>({
    queryKey: ["cost-book-plan-lookup", bookId, planId],
    queryFn: async () => {
      if (!bookId || !planId) return null;
      const { data, error } = await supabase
        .from("cost_book_plans")
        .select("*")
        .eq("cost_book_id", bookId)
        .eq("floor_plan_id", planId)
        .maybeSingle();
      if (error) throw error;
      return data as CostBookPlan | null;
    },
    enabled: !!bookId && !!planId,
  });
}
