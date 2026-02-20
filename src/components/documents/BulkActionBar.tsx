import { ArrowRightLeft, Download, Share2, Trash2, X } from "lucide-react";

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
    <div className="flex items-center gap-3 border-b border-border bg-[#1B3022]/5 px-4 py-2">
      <span className="text-sm font-medium text-[#1B3022]">{selectedCount} selected</span>
      <div className="flex items-center gap-1">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        )}
        <button
          type="button"
          onClick={onMove}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" /> Move
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-accent/50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
      <div className="flex-1" />
      <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
