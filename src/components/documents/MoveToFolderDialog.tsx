import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DocumentFolder } from "@/hooks/useDocumentFolders";

interface MoveToFolderDialogProps {
  folders: DocumentFolder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

export function MoveToFolderDialog({ folders, currentFolderId, onMove, onClose }: MoveToFolderDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);

  const rootFolders = folders.filter((f) => !f.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const renderFolder = (folder: DocumentFolder, depth: number): React.ReactNode => {
    const children = folders.filter((f) => f.parent_id === folder.id).sort((a, b) => a.sort_order - b.sort_order);
    const isSelected = selectedId === folder.id;
    const isCurrent = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          type="button"
          onClick={() => setSelectedId(folder.id)}
          disabled={isCurrent}
          className={cn(
            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors",
            isSelected ? "bg-[#143A23]/10 text-[#143A23] font-medium" : "text-foreground hover:bg-accent/50",
            isCurrent && "opacity-40",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="truncate">{folder.name}</span>
          {isSelected && <span className="ml-auto h-3.5 w-3.5 shrink-0 text-xs">&#10003;</span>}
        </button>
        {children.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[360px] rounded-lg border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Move to Folder</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <span className="h-4 w-4 text-sm leading-none">&times;</span>
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {/* Root / No Folder */}
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors",
              selectedId === null ? "bg-[#143A23]/10 text-[#143A23] font-medium" : "text-foreground hover:bg-accent/50",
            )}
          >
            <span>No Folder (Root)</span>
            {selectedId === null && <span className="ml-auto h-3.5 w-3.5 shrink-0 text-xs">&#10003;</span>}
          </button>

          {rootFolders.map((folder) => renderFolder(folder, 0))}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onMove(selectedId)}
            disabled={selectedId === currentFolderId}
            className="rounded-lg bg-button px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
