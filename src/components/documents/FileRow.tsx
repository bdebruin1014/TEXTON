import {
  Archive,
  ArrowRightLeft,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Film,
  Image,
  MoreHorizontal,
  Pencil,
  File as FileIcon,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { getFileIcon } from "@/lib/documents/icons";
import { getOfficeAppName } from "@/lib/documents/webdav";
import { formatFileSize } from "@/lib/documents/storage";
import type { DocumentRecord } from "@/hooks/useDocuments";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileText,
  FileSpreadsheet,
  Image,
  Film,
  File: FileIcon,
  Archive,
  Presentation: FileIcon,
};

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
}: FileRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const iconConfig = getFileIcon(doc.file_extension);
  const IconComponent = ICON_MAP[iconConfig.icon] ?? FileIcon;
  const officeApp = getOfficeAppName(doc.file_extension);

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
        <div className="flex items-center gap-2.5">
          <IconComponent className="h-5 w-5 shrink-0" style={{ color: iconConfig.color }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {doc.name}
              {doc.file_extension && (
                <span className="text-muted-foreground">{doc.file_extension}</span>
              )}
            </div>
          </div>
        </div>
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
            <Pencil className="h-3 w-3" />
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
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 min-w-[180px] rounded-lg border border-border bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { onDownload(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {officeApp && (
                <button
                  type="button"
                  onClick={() => { onEditInPlace(doc); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit in {officeApp}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Rename document:", doc.name);
                  if (name && name !== doc.name) onRename(doc.id, name);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                <Eye className="h-3.5 w-3.5" /> Rename
              </button>
              <button
                type="button"
                onClick={() => { onMove(doc.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Move to Folder
              </button>
              <button
                type="button"
                onClick={() => { onArchive(doc.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={() => { onDelete(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent/50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
