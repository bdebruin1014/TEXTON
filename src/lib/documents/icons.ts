export interface FileIconConfig {
  label: string;
  color: string;
}

export const FILE_ICONS: Record<string, FileIconConfig> = {
  ".pdf": { color: "#946060", label: "PDF" },
  ".docx": { color: "#4A6B8A", label: "DOCX" },
  ".doc": { color: "#4A6B8A", label: "DOC" },
  ".xlsx": { color: "#4A7A5B", label: "XLSX" },
  ".xls": { color: "#4A7A5B", label: "XLS" },
  ".pptx": { color: "#9A7B4A", label: "PPTX" },
  ".ppt": { color: "#9A7B4A", label: "PPT" },
  ".png": { color: "#6B5B80", label: "PNG" },
  ".jpg": { color: "#6B5B80", label: "JPG" },
  ".jpeg": { color: "#6B5B80", label: "JPEG" },
  ".gif": { color: "#6B5B80", label: "GIF" },
  ".svg": { color: "#6B5B80", label: "SVG" },
  ".zip": { color: "#8896A6", label: "ZIP" },
  ".rar": { color: "#8896A6", label: "RAR" },
  ".txt": { color: "#8896A6", label: "TXT" },
  ".csv": { color: "#8896A6", label: "CSV" },
  ".mp4": { color: "#946060", label: "MP4" },
  ".mov": { color: "#946060", label: "MOV" },
};

const DEFAULT_ICON: FileIconConfig = { color: "#8896A6", label: "FILE" };

export function getFileIcon(extension: string | null | undefined): FileIconConfig {
  if (!extension) return DEFAULT_ICON;
  const ext = extension.toLowerCase().startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return FILE_ICONS[ext] ?? DEFAULT_ICON;
}
