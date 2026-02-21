import { useState, useCallback, useRef, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentRecord {
  id: string;
  name: string;
  file_extension: string | null;
  file_size: number | null;
  folder_id: string | null;
  bucket: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
  sort_order?: number;
  [key: string]: unknown;
}

export interface DragDropFileListProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDragStart: (docIds: string[]) => void;
  onDragEnd: () => void;
  onDownload?: (doc: DocumentRecord) => void;
  onRename?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onOpen?: (doc: DocumentRecord) => void;
}

export interface DocumentDragData {
  type: "documents";
  documentIds: string[];
  sourceFolderId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileLabel(ext: string | null): string {
  const e = (ext ?? "").toLowerCase().replace(".", "");
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(e)) return "IMG";
  if (["xls", "xlsx", "csv"].includes(e)) return "XLS";
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(e)) return "DOC";
  return "FILE";
}

// ---------------------------------------------------------------------------
// useMoveDocument mutation
// ---------------------------------------------------------------------------

export function useMoveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: string; folderId: string | null }) => {
      const { error } = await supabase.from("documents").update({ folder_id: folderId }).eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useReorderDocument mutation
// ---------------------------------------------------------------------------

function useReorderDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, sortOrder }: { documentId: string; sortOrder: number }) => {
      const { error } = await supabase.from("documents").update({ sort_order: sortOrder }).eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DragDropFileList({
  documents,
  isLoading,
  selectedIds,
  onSelectionChange,
  onDragStart,
  onDragEnd,
  onDownload,
  onRename,
  onDelete,
  onOpen,
}: DragDropFileListProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const dragSourceIndex = useRef<number | null>(null);
  const reorderMutation = useReorderDocument();

  // ---- Selection helpers ----

  const toggleSelection = useCallback(
    (id: string, shiftKey: boolean) => {
      const next = new Set(selectedIds);
      if (shiftKey) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        if (next.has(id) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.size === documents.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(documents.map((d) => d.id)));
    }
  }, [selectedIds, documents, onSelectionChange]);

  // ---- Drag handlers ----

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLTableRowElement>, doc: DocumentRecord, index: number) => {
      dragSourceIndex.current = index;

      const ids = selectedIds.has(doc.id) ? Array.from(selectedIds) : [doc.id];

      const dragData: DocumentDragData = {
        type: "documents",
        documentIds: ids,
        sourceFolderId: doc.folder_id,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = "move";

      // Create custom drag ghost
      const ghost = document.createElement("div");
      ghost.className = "bg-white border border-border rounded-md px-3 py-2 shadow-lg text-sm font-medium";
      ghost.textContent = ids.length > 1 ? `${ids.length} files` : doc.name;
      ghost.style.position = "absolute";
      ghost.style.top = "-9999px";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);

      onDragStart(ids);
    },
    [selectedIds, onDragStart],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLTableRowElement>, targetIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      const sourceIndex = dragSourceIndex.current;
      if (sourceIndex === null || sourceIndex === targetIndex) return;

      // Reorder within the same folder
      const doc = documents[sourceIndex];
      if (doc) {
        reorderMutation.mutate({ documentId: doc.id, sortOrder: targetIndex });
      }

      dragSourceIndex.current = null;
      onDragEnd();
    },
    [documents, reorderMutation, onDragEnd],
  );

  const handleDragEndRow = useCallback(() => {
    setDragOverIndex(null);
    dragSourceIndex.current = null;
    onDragEnd();
  }, [onDragEnd]);

  // ---- Loading skeleton ----

  if (isLoading) {
    return (
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-slate-50">
              <th className="w-8 px-3 py-3" />
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Size
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Modified
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 py-3">
                  <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-3 py-3">
                  <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
                </td>
                <td className="px-3 py-3">
                  <div className="w-6 h-6 bg-slate-200 rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Empty state ----

  if (documents.length === 0) {
    return (
      <div className="bg-white border border-border rounded-lg p-12 text-center">
        <span className="block w-12 h-12 text-slate-300 mx-auto mb-4 text-3xl leading-[3rem] text-center">--</span>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">No documents</h3>
        <p className="text-sm text-slate-500">Upload files or drag documents here to get started.</p>
      </div>
    );
  }

  // ---- Table ----

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-slate-50">
            <th className="w-8 px-3 py-3">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={selectedIds.size === documents.length && documents.length > 0}
                onChange={toggleAll}
              />
            </th>
            <th className="w-8 px-3 py-3" />
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Size
            </th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Modified
            </th>
            <th className="w-10 px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, index) => {
            const fileLabel = getFileLabel(doc.file_extension);
            const isSelected = selectedIds.has(doc.id);
            const isDragOver = dragOverIndex === index;

            return (
              <tr
                key={doc.id}
                draggable
                onDragStart={(e) => handleDragStart(e, doc, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEndRow}
                onClick={() => onOpen?.(doc)}
                className={cn(
                  "border-b border-border cursor-pointer transition-colors",
                  isSelected ? "bg-emerald-50" : "hover:bg-slate-50",
                  isDragOver && "border-t-2 border-t-[#143A23]",
                )}
              >
                {/* Checkbox */}
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(doc.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey);
                    }}
                  />
                </td>

                {/* Drag handle */}
                <td className="px-1 py-3 text-slate-400 cursor-grab active:cursor-grabbing">
                  <span className="text-xs select-none">::</span>
                </td>

                {/* Name */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 shrink-0 w-5 text-center">{fileLabel}</span>
                    <span className="text-sm font-medium text-slate-800 truncate">{doc.name}</span>
                    {doc.file_extension && (
                      <span className="text-xs text-slate-400 uppercase">{doc.file_extension.replace(".", "")}</span>
                    )}
                  </div>
                </td>

                {/* Size */}
                <td className="px-3 py-3 text-sm text-slate-500">{formatFileSize(doc.file_size)}</td>

                {/* Modified */}
                <td className="px-3 py-3 text-sm text-slate-500">{formatDate(doc.updated_at)}</td>

                {/* Actions */}
                <td className="px-3 py-3 relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-slate-100 transition-colors"
                    onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                  >
                    <span className="text-sm text-slate-500 font-bold leading-none">&middot;&middot;&middot;</span>
                  </button>

                  {activeMenuId === doc.id && (
                    <>
                      {/* Backdrop to close menu */}
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                        {onDownload && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              onDownload(doc);
                              setActiveMenuId(null);
                            }}
                          >
                            Download
                          </button>
                        )}
                        {onRename && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              onRename(doc);
                              setActiveMenuId(null);
                            }}
                          >
                            Rename
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              onDelete(doc);
                              setActiveMenuId(null);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
