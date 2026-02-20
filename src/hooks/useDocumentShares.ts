import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface DocumentShare {
  id: string;
  share_token: string;
  share_type: "folder" | "selection";
  folder_id: string | null;
  include_subfolders: boolean;
  record_type: string;
  record_id: string;
  allow_download: boolean;
  allow_upload: boolean;
  password_hash: string | null;
  expires_at: string | null;
  max_access_count: number | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_company: string | null;
  recipient_contact_id: string | null;
  message: string | null;
  subject: string | null;
  access_count: number;
  last_accessed_at: string | null;
  total_downloads: number;
  status: "active" | "expired" | "revoked";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export function useDocumentShares(recordType: string, recordId: string) {
  return useQuery({
    queryKey: ["document-shares", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_shares")
        .select("*, items:document_share_items(id, document_id, sort_order, download_count)")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (DocumentShare & { items: { id: string; document_id: string; sort_order: number; download_count: number }[] })[];
    },
  });
}


interface CreateShareInput {
  share_type: "folder" | "selection";
  folder_id?: string | null;
  include_subfolders?: boolean;
  record_type: string;
  record_id: string;
  allow_download?: boolean;
  password?: string;
  expires_at?: string | null;
  max_access_count?: number | null;
  recipient_name?: string;
  recipient_email?: string;
  recipient_company?: string;
  recipient_contact_id?: string | null;
  message?: string;
  subject?: string;
  document_ids?: string[];
  send_email?: boolean;
}

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateShareInput) => {
      const { document_ids, send_email, password, ...shareData } = input;

      // Hash password if provided
      let password_hash: string | null = null;
      if (password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        password_hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      const { data: user } = await supabase.auth.getUser();

      const { data: share, error } = await supabase
        .from("document_shares")
        .insert({
          ...shareData,
          password_hash,
          created_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert share items for selection type
      if (input.share_type === "selection" && document_ids?.length) {
        const items = document_ids.map((doc_id, i) => ({
          share_id: share.id,
          document_id: doc_id,
          sort_order: i,
        }));
        const { error: itemsError } = await supabase
          .from("document_share_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      // Send email notification if requested
      if (send_email && input.recipient_email) {
        await supabase.functions.invoke("send-document-email", {
          body: {
            template: "share_notification",
            share_id: share.id,
            recipient_email: input.recipient_email,
            recipient_name: input.recipient_name,
          },
        });
      }

      return share as DocumentShare;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["document-shares", variables.record_type, variables.record_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["document-shares-count", variables.record_type, variables.record_id],
      });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId }: { shareId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("document_shares")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: user.user?.id,
        })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-shares"] });
    },
  });
}

export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}
