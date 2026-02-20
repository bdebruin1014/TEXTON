export interface FileIconConfig {
  icon: string;
  color: string;
  label: string;
}

export const FILE_ICONS: Record<string, FileIconConfig> = {
  ".pdf": { icon: "FileText", color: "#EF4444", label: "PDF" },
  ".docx": { icon: "FileText", color: "#3B82F6", label: "DOCX" },
  ".doc": { icon: "FileText", color: "#3B82F6", label: "DOC" },
  ".xlsx": { icon: "FileSpreadsheet", color: "#10B981", label: "XLSX" },
  ".xls": { icon: "FileSpreadsheet", color: "#10B981", label: "XLS" },
  ".pptx": { icon: "Presentation", color: "#F59E0B", label: "PPTX" },
  ".ppt": { icon: "Presentation", color: "#F59E0B", label: "PPT" },
  ".png": { icon: "Image", color: "#8B5CF6", label: "PNG" },
  ".jpg": { icon: "Image", color: "#8B5CF6", label: "JPG" },
  ".jpeg": { icon: "Image", color: "#8B5CF6", label: "JPEG" },
  ".gif": { icon: "Image", color: "#8B5CF6", label: "GIF" },
  ".svg": { icon: "Image", color: "#8B5CF6", label: "SVG" },
  ".zip": { icon: "Archive", color: "#6B7280", label: "ZIP" },
  ".rar": { icon: "Archive", color: "#6B7280", label: "RAR" },
  ".txt": { icon: "File", color: "#6B7280", label: "TXT" },
  ".csv": { icon: "FileSpreadsheet", color: "#6B7280", label: "CSV" },
  ".mp4": { icon: "Film", color: "#EC4899", label: "MP4" },
  ".mov": { icon: "Film", color: "#EC4899", label: "MOV" },
};

const DEFAULT_ICON: FileIconConfig = { icon: "File", color: "#6B7280", label: "FILE" };

export function getFileIcon(extension: string | null | undefined): FileIconConfig {
  if (!extension) return DEFAULT_ICON;
  const ext = extension.toLowerCase().startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return FILE_ICONS[ext] ?? DEFAULT_ICON;
}
