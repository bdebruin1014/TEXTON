import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type SupabaseQueryFn<T> = () => PromiseLike<{ data: T | null; error: { message: string } | null }>;

export function useSupabaseQuery<T>(
  queryKey: string[],
  queryFn: SupabaseQueryFn<T>,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw new Error(error.message);
      if (data === null) throw new Error("No data returned");
      return data;
    },
    ...options,
  });
}

export function useSupabaseList<T>(table: string, queryKey: string[], select = "*", filters?: Record<string, unknown>) {
  return useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      let query = supabase.from(table).select(select);
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== "") {
            query = query.eq(key, value);
          }
        }
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
  });
}
