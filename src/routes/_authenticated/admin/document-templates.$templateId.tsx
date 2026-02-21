import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TemplateEditor } from "@/components/documents/TemplateEditor";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { ASSIGNABLE_RECORD_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/document-templates/$templateId")({
  component: DocumentTemplateDetail,
});

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  template: string | null;
  template_html: string | null;
  variables: unknown[];
  record_types: string[];
  is_active: boolean;
}

function DocumentTemplateDetail() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery<DocumentTemplate>({
    queryKey: ["document-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_templates").select("*").eq("id", templateId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("document_templates").update(updates).eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
    },
  });

  const [localHtml, setLocalHtml] = useState<string | null>(null);
  const [selectedRecordType, setSelectedRecordType] = useState("project");

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  const handleSaveHtml = async () => {
    if (localHtml === null) return;
    try {
      await mutation.mutateAsync({ template_html: localHtml });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    }
  };

  if (isLoading) return <FormSkeleton />;
  if (!template) return <div className="py-12 text-center text-sm text-muted">Template not found</div>;

  const htmlValue = localHtml ?? template.template_html ?? template.template ?? "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/documents/tags" })}
            className="mb-1 text-xs text-muted hover:text-foreground"
          >
            &larr; All Templates
          </button>
          <h2 className="text-lg font-semibold text-foreground">{template.name}</h2>
        </div>
        <button
          type="button"
          onClick={handleSaveHtml}
          disabled={localHtml === null}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white hover:bg-button-hover disabled:opacity-50"
        >
          Save Template
        </button>
      </div>

      {/* Template Metadata */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Template Settings</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AutoSaveField label="Name" value={template.name} onSave={save("name")} />
          <AutoSaveField
            label="Category"
            value={template.category}
            onSave={save("category")}
            placeholder="e.g. Contracts, Reports"
          />
          <AutoSaveSelect
            label="Active"
            value={template.is_active ? "Yes" : "No"}
            onSave={async (v) => {
              await mutation.mutateAsync({ is_active: v === "Yes" });
            }}
            options={["Yes", "No"]}
          />
        </div>
        <div className="mt-4">
          <AutoSaveField
            label="Description"
            value={template.description}
            onSave={save("description")}
            type="textarea"
            rows={2}
            placeholder="What this template generates..."
          />
        </div>
      </div>

      {/* Record type selector for variable context */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-muted">Variable context:</span>
        <select
          value={selectedRecordType}
          onChange={(e) => setSelectedRecordType(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        >
          {ASSIGNABLE_RECORD_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Template HTML Editor */}
      <TemplateEditor value={htmlValue} onChange={setLocalHtml} recordType={selectedRecordType} />
    </div>
  );
}
