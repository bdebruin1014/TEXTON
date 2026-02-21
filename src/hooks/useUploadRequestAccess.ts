import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface UploadRequestAccessItem {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  status: "pending" | "uploaded" | "accepted" | "rejected";
  accepted_extensions: string[] | null;
  max_file_size: number | null;
  fulfilled_at: string | null;
}

export interface UploadRequestAccessData {
  request: {
    id: string;
    subject: string;
    message: string | null;
    recipient_name: string | null;
    due_date: string | null;
    created_by_name: string | null;
    created_at: string;
    status: string;
  };
  items: UploadRequestAccessItem[];
}

export function useUploadRequestAccess(token: string | undefined) {
  return useQuery({
    queryKey: ["upload-request-access", token],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-request-access?token=${token}`,
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request not found" }));
        throw new Error(err.error || "Failed to load upload request");
      }
      return (await response.json()) as UploadRequestAccessData;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useFulfillUploadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, itemId, file }: { token: string; itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("item_id", itemId);
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-request-fulfill`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed");
      }

      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["upload-request-access", variables.token],
      });
    },
  });
}
