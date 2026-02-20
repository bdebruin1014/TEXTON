const WEBDAV_BASE = import.meta.env.VITE_WEBDAV_URL ?? "";

const OFFICE_PROTOCOLS: Record<string, string> = {
  ".docx": "ms-word",
  ".doc": "ms-word",
  ".xlsx": "ms-excel",
  ".xls": "ms-excel",
  ".pptx": "ms-powerpoint",
  ".ppt": "ms-powerpoint",
};

export function getEditInPlaceUrl(document: {
  id: string;
  file_extension: string | null;
  name: string;
}): string | null {
  if (!WEBDAV_BASE || !document.file_extension) return null;
  const protocol = OFFICE_PROTOCOLS[document.file_extension.toLowerCase()];
  if (!protocol) return null;

  const webdavUrl = `${WEBDAV_BASE}/files/${document.id}/${encodeURIComponent(document.name)}`;
  return `${protocol}:ofe|u|${webdavUrl}`;
}


export function getOfficeAppName(extension: string | null | undefined): string | null {
  if (!extension) return null;
  const ext = extension.toLowerCase().startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const map: Record<string, string> = {
    ".docx": "Word",
    ".doc": "Word",
    ".xlsx": "Excel",
    ".xls": "Excel",
    ".pptx": "PowerPoint",
    ".ppt": "PowerPoint",
  };
  return map[ext] ?? null;
}
