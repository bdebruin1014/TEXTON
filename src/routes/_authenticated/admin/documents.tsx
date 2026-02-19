import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  component: DocumentsAdmin,
});

interface DocumentTemplate {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  file_type: string | null;
  usage_count: number | null;
  created_at: string;
}

function DocumentsAdmin() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_templates").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("document_templates").insert({
        name: "New Document Template",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document-templates"] }),
  });

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Document Templates</h1>
          <p className="mt-0.5 text-sm text-muted">{templates.length} templates</p>
        </div>
        <button
          type="button"
          onClick={() => addTemplate.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Create Document
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState title="No document templates" description="Create templates for contracts, agreements, and forms" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                  {template.category && (
                    <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium">
                      {template.category}
                    </span>
                  )}
                  {template.description && <p className="mt-1 text-xs text-muted">{template.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                    {template.file_type && <span>{template.file_type.toUpperCase()}</span>}
                    <span>Used {template.usage_count ?? 0} times</span>
                    <span>{formatDate(template.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
