import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  invalidateKeys: string[][];
  enabled?: boolean;
}

export function useRealtime({ table, filter, invalidateKeys, enabled = true }: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const keysRef = useRef(invalidateKeys);
  keysRef.current = invalidateKeys;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter ?? "all"}`;
    let channel = supabase.channel(channelName);

    const config: Record<string, string> = {
      event: "*",
      schema: "public",
      table,
    };
    if (filter) config.filter = filter;

    channel = channel.on("postgres_changes", config as never, () => {
      for (const key of keysRef.current) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled, queryClient]);
}
