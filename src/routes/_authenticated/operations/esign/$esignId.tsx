import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Ban, RefreshCw } from "lucide-react";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { ESIGN_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/esign/$esignId")({
  component: EsignDetail,
});

interface EsignDocument {
  id: string;
  name: string;
  template_id: string | null;
  status: string;
  connected_record_type: string | null;
  connected_record_id: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface EsignSigner {
  id: string;
  document_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string;
  order_number: number;
  signed_at: string | null;
}

function EsignDetail() {
  const { esignId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: document, isLoading } = useQuery<EsignDocument>({
    queryKey: ["esign-document", esignId],
    queryFn: async () => {
      const { data, error } = await supabase.from("esign_documents").select("*").eq("id", esignId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: signers = [] } = useQuery<EsignSigner[]>({
    queryKey: ["esign-signers", esignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esign_signers")
        .select("*")
        .eq("document_id", esignId)
        .order("order_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("esign_documents").update(updates).eq("id", esignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esign-document", esignId] });
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
    },
  });

  const voidDocument = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("esign_documents").update({ status: "Voided" }).eq("id", esignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esign-document", esignId] });
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
    },
  });

  const resendDocument = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("esign_documents")
        .update({ status: "Sent", sent_at: new Date().toISOString() })
        .eq("id", esignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esign-document", esignId] });
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!document) {
    return <EmptyState title="Document not found" description="This e-sign document may have been removed" />;
  }

  const signerColumns: ColumnDef<EsignSigner, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name") ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("email") ?? "—"}</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("role") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "signed_at",
      header: "Signed At",
      cell: ({ row }) => {
        const val = row.getValue("signed_at") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
  ];

  const isTerminal = document.status === "Completed" || document.status === "Voided" || document.status === "Expired";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/operations/esign" className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to E-Sign Documents
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{document.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={document.status} />
              {document.sent_at && <span className="text-xs text-muted">Sent {formatDate(document.sent_at)}</span>}
              {document.completed_at && (
                <span className="text-xs text-muted">Completed {formatDate(document.completed_at)}</span>
              )}
            </div>
          </div>
          {!isTerminal && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => voidDocument.mutate()}
                disabled={voidDocument.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                {voidDocument.isPending ? "Voiding..." : "Void Document"}
              </button>
              <button
                type="button"
                onClick={() => resendDocument.mutate()}
                disabled={resendDocument.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                {resendDocument.isPending ? "Resending..." : "Resend"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document Information */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Document Information</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <AutoSaveField label="Document Name" value={document.name} onSave={save("name")} />
          <AutoSaveSelect
            label="Status"
            value={document.status}
            options={[...ESIGN_STATUSES].map((s) => ({ label: s, value: s }))}
            onSave={save("status")}
          />
          <AutoSaveField label="Template ID" value={document.template_id ?? ""} onSave={save("template_id")} />
          <AutoSaveField
            label="Connected Record Type"
            value={document.connected_record_type ?? ""}
            onSave={save("connected_record_type")}
          />
          <AutoSaveField
            label="Connected Record ID"
            value={document.connected_record_id ?? ""}
            onSave={save("connected_record_id")}
          />
          <AutoSaveField
            label="Created"
            value={document.created_at ? formatDate(document.created_at) : ""}
            onSave={async () => {}}
            disabled
          />
        </div>
      </div>

      {/* Signers */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Signers ({signers.length})</h2>
        </div>
        {signers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No signers assigned to this document</p>
        ) : (
          <DataTable columns={signerColumns} data={signers} searchKey="name" searchPlaceholder="Search signers..." />
        )}
      </div>
    </div>
  );
}
