import { Download, FileText } from "lucide-react";

interface ShareFileRowProps {
  name: string;
  fileExtension: string;
  fileSize: number;
  updatedAt: string;
  allowDownload: boolean;
  onDownload: () => void;
  isDownloading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ShareFileRow({
  name,
  fileExtension,
  fileSize,
  updatedAt,
  allowDownload,
  onDownload,
  isDownloading,
}: ShareFileRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 transition-colors hover:bg-slate-50">
      <FileText className="h-5 w-5 shrink-0 text-[#1B3022]/60" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {name}
          {fileExtension && <span className="text-slate-400">{fileExtension}</span>}
        </div>
        <div className="text-xs text-slate-500">
          {formatBytes(fileSize)} · {new Date(updatedAt).toLocaleDateString()}
        </div>
      </div>
      {allowDownload && (
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {isDownloading ? "..." : "Download"}
        </button>
      )}
    </div>
  );
}
