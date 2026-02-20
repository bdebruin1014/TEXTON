import { FolderPlus, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentFolder } from "@/hooks/useDocumentFolders";
import { FolderTreeItem } from "./FolderTreeItem";

interface FolderTreeProps {
  folders: DocumentFolder[];
  activeFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddFolder: (parentId: string | null) => void;
}

export function FolderTree({
  folders,
  activeFolderId,
  onFolderSelect,
  onRename,
  onDelete,
  onAddFolder,
}: FolderTreeProps) {
  const rootFolders = folders.filter((f) => !f.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* All Documents */}
        <button
          type="button"
          onClick={() => onFolderSelect(null)}
          className={cn(
            "flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50",
            activeFolderId === null
              ? "border-l-[#1B3022] bg-accent/30 font-medium text-foreground"
              : "border-transparent text-muted-foreground",
          )}
        >
          <Layers className="h-4 w-4 shrink-0" />
          All Documents
        </button>

        {/* Folder tree */}
        {rootFolders.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            allFolders={folders}
            activeFolderId={activeFolderId}
            onSelect={onFolderSelect}
            depth={0}
            onRename={onRename}
            onDelete={onDelete}
            onAddSubfolder={onAddFolder}
          />
        ))}
      </div>

      {/* New Folder button */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => onAddFolder(null)}
          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </button>
      </div>
    </div>
  );
}
