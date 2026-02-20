import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UploadRequestItem {
  id: string;
  request_id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  accepted_extensions: string[] | null;
  max_file_size: number | null;
  destination_folder_id: string | null;
  auto_tag: string | null;
  status: "pending" | "uploaded" | "accepted" | "rejected";
  fulfilled_document_id: string | null;
  fulfilled_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadRequest {
  id: string;
  request_token: string;
  record_type: string;
  record_id: string;
  destination_folder_id: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string | null;
  recipient_contact_id: string | null;
  subject: string;
  message: string | null;
  due_date: string | null;
  expires_at: string | null;
  max_total_upload_size: number;
  status: "draft" | "pending" | "partial" | "complete" | "expired" | "cancelled";
  sent_at: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  notify_on_upload: boolean;
  notify_on_complete: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: UploadRequestItem[];
}

export function useUploadRequests(recordType: string, recordId: string) {
  return useQuery({
    queryKey: ["upload-requests", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upload_requests")
        .select("*, items:upload_request_items(*)")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UploadRequest[];
    },
  });
}

export function usePendingUploadRequestCount(recordType: string, recordId: string) {
  return useQuery({
    queryKey: ["upload-requests-count", recordType, recordId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("upload_requests")
        .select("id", { count: "exact", head: true })
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .in("status", ["pending", "partial"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

interface CreateUploadRequestInput {
  record_type: string;
  record_id: string;
  destination_folder_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_company?: string;
  recipient_contact_id?: string | null;
  subject: string;
  message?: string;
  due_date?: string | null;
  expires_at?: string | null;
  notify_on_upload?: boolean;
  notify_on_complete?: boolean;
  items: {
    name: string;
    description?: string;
    is_required?: boolean;
    accepted_extensions?: string[];
    max_file_size?: number;
    destination_folder_id?: string | null;
    auto_tag?: string;
  }[];
}

export function useCreateUploadRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUploadRequestInput) => {
      const { items, ...requestData } = input;
      const { data: user } = await supabase.auth.getUser();

      const { data: request, error } = await supabase
        .from("upload_requests")
        .insert({
          ...requestData,
          created_by: user.user?.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Insert items
      if (items.length > 0) {
        const itemRows = items.map((item, i) => ({
          request_id: request.id,
          name: item.name,
          description: item.description ?? null,
          is_required: item.is_required ?? true,
          sort_order: i,
          accepted_extensions: item.accepted_extensions ?? null,
          max_file_size: item.max_file_size ?? null,
          destination_folder_id: item.destination_folder_id ?? null,
          auto_tag: item.auto_tag ?? null,
        }));
        const { error: itemsError } = await supabase
          .from("upload_request_items")
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }

      // Send email notification
      if (input.recipient_email) {
        await supabase.functions.invoke("send-document-email", {
          body: {
            template: "upload_request",
            request_id: request.id,
            recipient_email: input.recipient_email,
            recipient_name: input.recipient_name,
          },
        });
      }

      return request as UploadRequest;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["upload-requests", variables.record_type, variables.record_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["upload-requests-count", variables.record_type, variables.record_id],
      });
    },
  });
}

export function useCancelUploadRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from("upload_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-requests"] });
    },
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { data: request, error: fetchError } = await supabase
        .from("upload_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      if (fetchError) throw fetchError;

      await supabase.functions.invoke("send-document-email", {
        body: {
          template: "reminder",
          request_id: requestId,
          recipient_email: request.recipient_email,
          recipient_name: request.recipient_name,
        },
      });

      const { error } = await supabase
        .from("upload_requests")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-requests"] });
    },
  });
}

export function getUploadRequestUrl(token: string): string {
  return `${window.location.origin}/upload/${token}`;
}
