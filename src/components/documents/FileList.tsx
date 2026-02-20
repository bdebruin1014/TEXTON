import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DocumentRecord } from "@/hooks/useDocuments";
import { FileRow } from "./FileRow";

type SortKey = "name" | "file_extension" | "updated_at" | "file_size";
type SortDir = "asc" | "desc";

interface FileListProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDownload: (doc: DocumentRecord) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (doc: DocumentRecord) => void;
  onEditInPlace: (doc: DocumentRecord) => void;
  onPreview?: (doc: DocumentRecord) => void;
  onVersionHistory?: (doc: DocumentRecord) => void;
  onShare?: (doc: DocumentRecord) => void;
}

export function FileList({
  documents,
  isLoading,
  selectedIds,
  onSelectionChange,
  onDownload,
  onRename,
  onMove,
  onArchive,
  onDelete,
  onEditInPlace,
  onPreview,
  onVersionHistory,
  onShare,
}: FileListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...documents].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });

  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(documents.map((d) => d.id)));
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-accent/30" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState title="No files in this folder" description="Upload files or drag and drop them here" />
      </div>
    );
  }

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <th
      className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      onClick={() => toggleSort(sortKeyVal)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyVal && <span>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
      </span>
    </th>
  );

  return (
    <table className="w-full">
      <thead className="border-b border-border bg-white">
        <tr>
          <th className="w-10 px-3 py-2.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5 rounded border-border"
            />
          </th>
          <SortHeader label="Name" sortKeyVal="name" />
          <SortHeader label="Type" sortKeyVal="file_extension" />
          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground" />
          <SortHeader label="Modified" sortKeyVal="updated_at" />
          <SortHeader label="Size" sortKeyVal="file_size" />
          <th className="w-10 px-3 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {sorted.map((doc) => (
          <FileRow
            key={doc.id}
            doc={doc}
            selected={selectedIds.has(doc.id)}
            onSelect={handleSelect}
            onDownload={onDownload}
            onRename={onRename}
            onMove={onMove}
            onArchive={onArchive}
            onDelete={onDelete}
            onEditInPlace={onEditInPlace}
            onPreview={onPreview}
            onVersionHistory={onVersionHistory}
            onShare={onShare}
          />
        ))}
      </tbody>
    </table>
  );
}
