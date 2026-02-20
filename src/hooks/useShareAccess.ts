import { useMutation, useQuery } from "@tanstack/react-query";

export interface ShareAccessData {
  share: {
    id: string;
    share_type: "folder" | "selection";
    recipient_name: string | null;
    message: string | null;
    allow_download: boolean;
    created_by_name: string | null;
    created_at: string;
    expires_at: string | null;
    has_password: boolean;
    folder_name: string | null;
    folders: { id: string; name: string; parent_id: string | null; sort_order: number }[];
  };
  documents: {
    id: string;
    name: string;
    original_filename: string;
    file_extension: string;
    mime_type: string;
    file_size: number;
    updated_at: string;
    folder_id?: string;
  }[];
}

export function useShareAccess(token: string | undefined) {
  return useQuery({
    queryKey: ["share-access", token],
    queryFn: async () => {
      // Use fetch directly since functions.invoke doesn't support query params well
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-access?token=${token}`,
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Share not found" }));
        throw new Error(err.error || "Failed to load share");
      }
      return (await response.json()) as ShareAccessData;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useShareDownload() {
  return useMutation({
    mutationFn: async ({ token, documentId }: { token: string; documentId: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, documentId }),
        },
      );
      if (!response.ok) throw new Error("Download failed");
      const data = await response.json();
      return data.url as string;
    },
  });
}
