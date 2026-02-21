import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { type TagInfo, useDeleteTag, useDocumentTags, useRenameTag } from "@/hooks/useDocumentTags";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/documents/tags")({
  component: DocumentTagsPage,
});

// ---------------------------------------------------------------------------
// useAddTag — adds a new tag to a placeholder document or an existing one
// For admin purposes, we store a tag on a "system" document or simply
// ensure the tag exists by adding it to at least one document.
// In practice we'll add via the bulk-tag flow; this just creates the tag
// by inserting it into the tags taxonomy.
// ---------------------------------------------------------------------------

function useAddGlobalTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagName }: { tagName: string }) => {
      // Find any document and add the tag to it to register it in the taxonomy.
      // If no documents exist, we cannot create a "standalone" tag (they live on
      // documents). In that edge-case we surface an error.
      const { data: docs, error: fetchError } = await supabase.from("documents").select("id, tags").limit(1);
      if (fetchError) throw fetchError;
      if (!docs || docs.length === 0) {
        throw new Error("No documents exist yet. Upload a document first before creating tags.");
      }

      const doc = docs[0]!;
      const existing = new Set<string>((doc.tags as string[]) ?? []);
      existing.add(tagName);

      const { error } = await supabase
        .from("documents")
        .update({ tags: Array.from(existing) })
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---------------------------------------------------------------------------
// TableSkeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tag Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Usage Count
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-border">
              <td className="px-4 py-3">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-white border border-border rounded-lg p-12 text-center">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">No tags yet</h3>
      <p className="text-sm text-slate-500">Create your first tag to start organizing documents.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Edit Row
// ---------------------------------------------------------------------------

function TagRow({
  tag,
  onRename,
  onDelete,
  isRenaming,
}: {
  tag: TagInfo;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  isRenaming: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tag.name) {
      onRename(tag.name, trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(tag.name);
    setEditing(false);
  };

  return (
    <tr className="border-b border-border hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#143A23]/20 focus:border-[#143A23]"
            />
            <button
              type="button"
              onClick={commitEdit}
              className="p-1 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
            >
              {"✓"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
            >
              {"×"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{tag.name}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {tag.count} {tag.count === 1 ? "document" : "documents"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditValue(tag.name);
              setEditing(true);
            }}
            disabled={isRenaming}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            title="Rename tag"
          >
            <span className="text-xs font-medium">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(tag.name)}
            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="Delete tag"
          >
            <span className="text-xs font-medium">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function DocumentTagsPage() {
  const { data: tags, isLoading } = useDocumentTags();
  const renameMutation = useRenameTag();
  const deleteMutation = useDeleteTag();
  const addTagMutation = useAddGlobalTag();

  const [showAddInput, setShowAddInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (showAddInput) {
      addInputRef.current?.focus();
    }
  }, [showAddInput]);

  const handleAddTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    // Check for duplicate
    if (tags?.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    addTagMutation.mutate(
      { tagName: trimmed },
      {
        onSuccess: () => {
          setNewTagName("");
          setShowAddInput(false);
        },
      },
    );
  };

  const handleRename = (oldName: string, newName: string) => {
    renameMutation.mutate({ oldName, newName });
  };

  const handleDelete = (tagName: string) => {
    if (confirmDelete === tagName) {
      deleteMutation.mutate({ tagName }, { onSuccess: () => setConfirmDelete(null) });
    } else {
      setConfirmDelete(tagName);
      // Auto-dismiss confirm after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Tags</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your document tag taxonomy</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
            "bg-[#143A23] hover:bg-[#143A23]/90",
          )}
        >
          Add Tag
        </button>
      </div>

      {/* Confirm-delete banner */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Remove tag <strong>"{confirmDelete}"</strong> from all documents? Click delete again to confirm.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : !tags || tags.length === 0 ? (
        <>
          {showAddInput && (
            <div className="bg-white border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") {
                      setShowAddInput(false);
                      setNewTagName("");
                    }
                  }}
                  className="border border-border rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#143A23]/20 focus:border-[#143A23]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!newTagName.trim() || addTagMutation.isPending}
                  className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-white bg-[#143A23] hover:bg-[#143A23]/90 disabled:opacity-50 transition-colors"
                >
                  {"✓"} Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewTagName("");
                  }}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  {"×"}
                </button>
              </div>
            </div>
          )}
          <EmptyState />
        </>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tag Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Usage Count
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Inline add row */}
              {showAddInput && (
                <tr className="border-b border-border bg-emerald-50/50">
                  <td className="px-4 py-3" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <input
                        ref={addInputRef}
                        type="text"
                        placeholder="Enter tag name..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag();
                          if (e.key === "Escape") {
                            setShowAddInput(false);
                            setNewTagName("");
                          }
                        }}
                        className="border border-border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#143A23]/20 focus:border-[#143A23]"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!newTagName.trim() || addTagMutation.isPending}
                        className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {"✓"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddInput(false);
                          setNewTagName("");
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                      >
                        {"×"}
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Tag rows */}
              {tags.map((tag) => (
                <TagRow
                  key={tag.name}
                  tag={tag}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  isRenaming={renameMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {tags && tags.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {tags.length} {tags.length === 1 ? "tag" : "tags"} total
        </p>
      )}
    </div>
  );
}
