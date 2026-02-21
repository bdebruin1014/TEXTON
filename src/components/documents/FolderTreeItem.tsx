import { useRef, useState } from "react";
import type { DocumentFolder } from "@/hooks/useDocumentFolders";
import { cn } from "@/lib/utils";

interface FolderTreeItemProps {
  folder: DocumentFolder;
  allFolders: DocumentFolder[];
  activeFolderId: string | null;
  onSelect: (id: string) => void;
  depth: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onShareFolder?: (folderId: string, folderName: string) => void;
}

export function FolderTreeItem({
  folder,
  allFolders,
  activeFolderId,
  onSelect,
  depth,
  onRename,
  onDelete,
  onAddSubfolder,
  onShareFolder,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const children = allFolders.filter((f) => f.parent_id === folder.id).sort((a, b) => a.sort_order - b.sort_order);
  const isActive = activeFolderId === folder.id;
  const hasChildren = children.length > 0;
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(folder.id)}
        onContextMenu={handleContextMenu}
        className={cn(
          "flex w-full items-center gap-1 border-l-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50",
          isActive
            ? "border-l-[#143A23] bg-accent/30 font-medium text-foreground"
            : "border-transparent text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center"
          >
            {expanded ? (
              <span className="h-3 w-3 text-xs leading-none">&#9662;</span>
            ) : (
              <span className="h-3 w-3 text-xs leading-none">&#9656;</span>
            )}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{folder.name}</span>
      </button>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeMenu} />
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-white py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                onAddSubfolder(folder.id);
                closeMenu();
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
            >
              Add Subfolder
            </button>
            {onShareFolder && (
              <button
                type="button"
                onClick={() => {
                  onShareFolder(folder.id, folder.name);
                  closeMenu();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Share Folder
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const name = prompt("Rename folder:", folder.name);
                if (name && name !== folder.name) onRename(folder.id, name);
                closeMenu();
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent/50"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete folder "${folder.name}"? Files will be moved to the parent folder.`)) {
                  onDelete(folder.id);
                }
                closeMenu();
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent/50"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              activeFolderId={activeFolderId}
              onSelect={onSelect}
              depth={depth + 1}
              onRename={onRename}
              onDelete={onDelete}
              onAddSubfolder={onAddSubfolder}
              onShareFolder={onShareFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
