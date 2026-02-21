import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/documents/folder-templates/$templateId")({
  component: FolderTemplateEditor,
});

interface TemplateItem {
  id: string;
  template_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  description: string | null;
  auto_tag: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  record_type: string;
  project_type: string | null;
  is_default: boolean;
  is_active: boolean;
  items: TemplateItem[];
}

function FolderTemplateEditor() {
  const { templateId } = Route.useParams();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<Template>({
    queryKey: ["folder-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folder_templates")
        .select("*, items:folder_template_items(*)")
        .eq("id", templateId)
        .single();
      if (error) throw error;
      return data as Template;
    },
  });

  useEffect(() => {
    if (data) {
      setTemplate(data);
      setItems(data.items.sort((a, b) => a.sort_order - b.sort_order));
      setExpandedIds(new Set(data.items.filter((i) => i.parent_id === null).map((i) => i.id)));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!template) return;

      // Update template
      const { error: templateError } = await supabase
        .from("folder_templates")
        .update({
          name: template.name,
          description: template.description,
          is_default: template.is_default,
        })
        .eq("id", template.id);
      if (templateError) throw templateError;

      // Delete all existing items and re-insert
      await supabase.from("folder_template_items").delete().eq("template_id", template.id);

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("folder_template_items").insert(
          items.map((item) => ({
            id: item.id,
            template_id: template.id,
            parent_id: item.parent_id,
            name: item.name,
            sort_order: item.sort_order,
            description: item.description,
            auto_tag: item.auto_tag,
          })),
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["folder-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["folder-templates"] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!template) return { applied: 0 };

      const tableName =
        template.record_type === "opportunity"
          ? "opportunities"
          : template.record_type === "job"
            ? "jobs"
            : template.record_type === "disposition"
              ? "dispositions"
              : "projects";

      let query = supabase.from(tableName).select("id");
      if (template.project_type) {
        query = query.eq("project_type", template.project_type);
      }

      const { data: records } = await query;
      if (!records) return { applied: 0 };

      let applied = 0;
      for (const record of records) {
        const { count } = await supabase
          .from("document_folders")
          .select("id", { count: "exact", head: true })
          .eq("record_type", template.record_type)
          .eq("record_id", record.id)
          .not("template_item_id", "is", null);

        if ((count ?? 0) === 0) {
          await supabase.rpc("apply_folder_template", {
            p_template_id: template.id,
            p_record_type: template.record_type,
            p_record_id: record.id,
          });
          applied++;
        }
      }

      return { applied };
    },
    onSuccess: (result) => {
      if (result) {
        alert(`Applied template to ${result.applied} record(s).`);
      }
    },
  });

  const addItem = useCallback(
    (parentId: string | null) => {
      const id = crypto.randomUUID();
      const siblings = items.filter((i) => i.parent_id === parentId);
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sort_order)) : 0;
      setItems((prev) => [
        ...prev,
        {
          id,
          template_id: templateId,
          parent_id: parentId,
          name: "New Folder",
          sort_order: maxOrder + 1,
          description: null,
          auto_tag: null,
        },
      ]);
      if (parentId) setExpandedIds((prev) => new Set([...prev, parentId]));
      setEditingId(id);
      setIsDirty(true);
    },
    [items, templateId],
  );

  const removeItem = useCallback(
    (id: string) => {
      // Remove item and all descendants
      const toRemove = new Set<string>();
      const collectChildren = (parentId: string) => {
        toRemove.add(parentId);
        items.filter((i) => i.parent_id === parentId).forEach((child) => collectChildren(child.id));
      };
      collectChildren(id);
      setItems((prev) => prev.filter((i) => !toRemove.has(i.id)));
      setIsDirty(true);
    },
    [items],
  );

  const renameItem = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
    setEditingId(null);
    setIsDirty(true);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: TemplateItem, depth: number): React.ReactNode => {
    const children = items.filter((i) => i.parent_id === item.id).sort((a, b) => a.sort_order - b.sort_order);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const isEditing = editingId === item.id;

    return (
      <div key={item.id}>
        <div
          className="group flex items-center gap-1 border-b border-border/50 py-1.5 hover:bg-accent/30"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <span className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 text-xs leading-none">
            {"⋮⋮"}
          </span>
          {hasChildren ? (
            <button type="button" onClick={() => toggleExpand(item.id)} className="shrink-0 p-0.5">
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}
          {isEditing ? (
            <input
              ref={editInputRef}
              autoFocus
              type="text"
              defaultValue={item.name}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameItem(item.id, (e.target as HTMLInputElement).value);
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={(e) => renameItem(item.id, e.target.value)}
              className="flex-1 rounded border border-[#143A23] bg-white px-1.5 py-0.5 text-sm outline-none"
            />
          ) : (
            <span className="flex-1 cursor-text truncate text-sm text-foreground" onClick={() => setEditingId(item.id)}>
              {item.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => addItem(item.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            title="Add subfolder"
          ></button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${item.name}" and its subfolders from the template?`)) {
                removeItem(item.id);
              }
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            title="Delete"
          >
            <span className="text-xs font-medium">Delete</span>
          </button>
        </div>
        {isExpanded && children.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  if (isLoading || !template) {
    return <FormSkeleton />;
  }

  const rootItems = items.filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/documents/folder-templates"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"←"}
          Back to Folder Templates
        </Link>
        <h2 className="text-lg font-semibold text-foreground">{template.name}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Applied to: {template.record_type}
          {template.project_type ? ` → ${template.project_type}` : " (all)"}
        </p>
      </div>

      {/* Default checkbox */}
      <label className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={template.is_default}
          onChange={(e) => {
            setTemplate({ ...template, is_default: e.target.checked });
            setIsDirty(true);
          }}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-sm text-foreground">Set as default (auto-apply on new record creation)</span>
      </label>

      {/* Tree editor */}
      <div className="mb-6 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folder Structure</span>
          <button
            type="button"
            onClick={() => addItem(null)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#143A23] hover:bg-accent/50"
          >
            Add Folder
          </button>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {rootItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No folders defined. Click "Add Folder" to get started.
            </div>
          ) : (
            rootItems.map((item) => renderItem(item, 0))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save Template"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Apply this template to all matching records that don't already have template folders?")) {
              applyMutation.mutate();
            }
          }}
          disabled={applyMutation.isPending || isDirty}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/50 disabled:opacity-50"
        >
          {applyMutation.isPending ? "Applying..." : "Apply to Existing Records"}
        </button>
      </div>
    </div>
  );
}
