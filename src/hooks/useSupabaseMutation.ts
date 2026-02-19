import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface UseSupabaseMutationOptions<TData, TVariables> {
  table: string;
  type: "insert" | "update" | "upsert" | "delete";
  matchKey?: string;
  matchValue?: string;
  invalidateKeys?: string[][];
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export function useSupabaseMutation<
  TData = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>({
  table,
  type,
  matchKey = "id",
  matchValue,
  invalidateKeys = [],
  onSuccess,
}: UseSupabaseMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      let result: { data: unknown; error: { message: string } | null };

      if (type === "insert") {
        result = await supabase.from(table).insert(variables).select().single();
      } else if (type === "update") {
        const id = matchValue ?? (variables as Record<string, unknown>)[matchKey];
        result = await supabase.from(table).update(variables).eq(matchKey, id).select().single();
      } else if (type === "upsert") {
        result = await supabase.from(table).upsert(variables).select().single();
      } else {
        const id = matchValue ?? (variables as Record<string, unknown>)[matchKey];
        result = await supabase.from(table).delete().eq(matchKey, id);
      }

      if (result.error) throw new Error(result.error.message);
      return result.data as TData;
    },
    onSuccess: (data, variables) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onSuccess?.(data, variables);
    },
  });
}

export function useFieldMutation(table: string, id: string, invalidateKeys: string[][]) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, Record<string, unknown>>({
    mutationFn: async (updates) => {
      const { error } = await supabase.from(table).update(updates).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
