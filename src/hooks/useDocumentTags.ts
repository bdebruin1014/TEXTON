import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagInfo {
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------
// useDocumentTags — query all unique tags with usage counts
// ---------------------------------------------------------------------------

export function useDocumentTags() {
  return useQuery<TagInfo[]>({
    queryKey: ["document-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("tags")
        .not("tags", "eq", "{}");
      if (error) throw error;

      const tagCounts = new Map<string, number>();
      for (const doc of data ?? []) {
        for (const tag of (doc.tags as string[]) ?? []) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }

      return Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

// ---------------------------------------------------------------------------
// useUniqueTagNames — convenience: just the tag strings
// ---------------------------------------------------------------------------

export function useUniqueTagNames() {
  return useQuery<string[]>({
    queryKey: ["document-tags", "names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("tags")
        .not("tags", "eq", "{}");
      if (error) throw error;

      const tagSet = new Set<string>();
      for (const doc of data ?? []) {
        for (const tag of (doc.tags as string[]) ?? []) {
          tagSet.add(tag);
        }
      }
      return Array.from(tagSet).sort();
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateDocumentTags — set tags on a single document
// ---------------------------------------------------------------------------

export function useUpdateDocumentTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, tags }: { documentId: string; tags: string[] }) => {
      const { error } = await supabase
        .from("documents")
        .update({ tags })
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useBulkTagDocuments — add / remove tags on multiple documents
// ---------------------------------------------------------------------------

export function useBulkTagDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentIds,
      addTags = [],
      removeTags = [],
    }: {
      documentIds: string[];
      addTags?: string[];
      removeTags?: string[];
    }) => {
      // Fetch current tags for each document
      const { data: docs, error: fetchError } = await supabase
        .from("documents")
        .select("id, tags")
        .in("id", documentIds);
      if (fetchError) throw fetchError;

      // Update each document's tags
      const updates = (docs ?? []).map((doc: { id: string; tags: string[] | null }) => {
        const current = new Set<string>((doc.tags as string[]) ?? []);
        for (const tag of addTags) current.add(tag);
        for (const tag of removeTags) current.delete(tag);
        return supabase
          .from("documents")
          .update({ tags: Array.from(current) })
          .eq("id", doc.id);
      });

      const results = await Promise.all(updates);
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useRenameTag — rename a tag across ALL documents
// ---------------------------------------------------------------------------

export function useRenameTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      // Find all documents that have the old tag
      const { data: docs, error: fetchError } = await supabase
        .from("documents")
        .select("id, tags")
        .contains("tags", [oldName]);
      if (fetchError) throw fetchError;

      const updates = (docs ?? []).map((doc: { id: string; tags: string[] | null }) => {
        const tags = ((doc.tags as string[]) ?? []).map((t: string) => (t === oldName ? newName : t));
        // Deduplicate in case newName was already present
        const unique = Array.from(new Set(tags));
        return supabase.from("documents").update({ tags: unique }).eq("id", doc.id);
      });

      const results = await Promise.all(updates);
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteTag — remove a tag from ALL documents
// ---------------------------------------------------------------------------

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagName }: { tagName: string }) => {
      const { data: docs, error: fetchError } = await supabase
        .from("documents")
        .select("id, tags")
        .contains("tags", [tagName]);
      if (fetchError) throw fetchError;

      const updates = (docs ?? []).map((doc: { id: string; tags: string[] | null }) => {
        const tags = ((doc.tags as string[]) ?? []).filter((t: string) => t !== tagName);
        return supabase.from("documents").update({ tags }).eq("id", doc.id);
      });

      const results = await Promise.all(updates);
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
    },
  });
}
