interface BulkActionBarProps {
  selectedCount: number;
  onMove: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShare?: () => void;
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, onMove, onDelete, onDownload, onShare, onClear }: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-2">
      <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
      <div className="flex items-center gap-1">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={onMove}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          Move
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          Download
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-accent/50"
        >
          Delete
        </button>
      </div>
      <div className="flex-1" />
      <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <span className="h-4 w-4 text-sm leading-none">&times;</span>
      </button>
    </div>
  );
}
