import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { getFileIcon } from "@/lib/documents/icons";
import { getOfficeAppName } from "@/lib/documents/webdav";
import { formatFileSize } from "@/lib/documents/storage";
import type { DocumentRecord } from "@/hooks/useDocuments";
import { TagEditor } from "./TagEditor";

interface FileRowProps {
  doc: DocumentRecord;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
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

export function FileRow({
  doc,
  selected,
  onSelect,
  onDownload,
  onRename,
  onMove,
  onArchive,
  onDelete,
  onEditInPlace,
  onPreview,
  onVersionHistory,
  onShare,
}: FileRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const iconConfig = getFileIcon(doc.file_extension);
  const officeApp = getOfficeAppName(doc.file_extension);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?doc=${doc.id}`;
    navigator.clipboard.writeText(url);
    setMenuOpen(false);
  };

  return (
    <tr className="group border-b border-border transition-colors hover:bg-accent/30">
      <td className="w-10 px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(doc.id, e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border"
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onPreview?.(doc)}
          className="flex items-center gap-2.5 text-left"
        >
          <span
            className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold uppercase"
            style={{ backgroundColor: `${iconConfig.color}20`, color: iconConfig.color }}
          >
            {iconConfig.label}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {doc.name}
              {doc.file_extension && (
                <span className="text-muted-foreground">{doc.file_extension}</span>
              )}
            </div>
            {/* Tags pills */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-[#1B3022]"
                  >
                    {tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{doc.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </button>
      </td>
      <td className="px-3 py-2">
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          style={{ backgroundColor: `${iconConfig.color}15`, color: iconConfig.color }}
        >
          {iconConfig.label}
        </span>
      </td>
      <td className="px-3 py-2">
        {officeApp && (
          <button
            type="button"
            onClick={() => onEditInPlace(doc)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#1B3022] transition-colors hover:bg-accent/50"
          >
            Edit in {officeApp}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(doc.updated_at)}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</td>
      <td className="relative w-10 px-3 py-2">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent/50"
        >
          <span className="h-4 w-4 text-sm leading-none">&hellip;</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 min-w-[200px] rounded-lg border border-border bg-white py-1 shadow-lg">
              {/* Preview */}
              <button
                type="button"
                onClick={() => { onPreview?.(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Preview
              </button>
              {/* Download */}
              <button
                type="button"
                onClick={() => { onDownload(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Download
              </button>
              {/* Edit in Office */}
              {officeApp && (
                <button
                  type="button"
                  onClick={() => { onEditInPlace(doc); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
                >
                  Edit in {officeApp}
                </button>
              )}
              {/* Share */}
              {onShare && (
                <button
                  type="button"
                  onClick={() => { onShare(doc); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
                >
                  Share
                </button>
              )}
              <div className="my-1 border-t border-border" />
              {/* Rename */}
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Rename document:", doc.name);
                  if (name && name !== doc.name) onRename(doc.id, name);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Rename
              </button>
              {/* Move to Folder */}
              <button
                type="button"
                onClick={() => { onMove(doc.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Move to Folder
              </button>
              {/* Tags */}
              <button
                type="button"
                onClick={() => { setShowTags(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Tags
              </button>
              {/* Version History */}
              <button
                type="button"
                onClick={() => { onVersionHistory?.(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Version History
              </button>
              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Copy Link
              </button>
              <div className="my-1 border-t border-border" />
              {/* Archive */}
              <button
                type="button"
                onClick={() => { onArchive(doc.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Archive
              </button>
              {/* Delete */}
              <button
                type="button"
                onClick={() => { onDelete(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent/50"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {/* Tag editor popover */}
        {showTags && (
          <TagEditor
            documentId={doc.id}
            currentTags={doc.tags ?? []}
            onTagsChange={() => setShowTags(false)}
            onClose={() => setShowTags(false)}
          />
        )}
      </td>
    </tr>
  );
}
