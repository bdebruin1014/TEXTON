import { canEditInPlace, getEditInPlaceUrl, getOfficeAppName } from "@/lib/documents/webdav";

interface EditInPlaceButtonProps {
  document: {
    id: string;
    name: string;
    file_extension: string | null;
    is_locked: boolean;
    locked_by: string | null;
  };
}

export function EditInPlaceButton({ document }: EditInPlaceButtonProps) {
  if (!canEditInPlace(document.file_extension)) return null;

  const appName = getOfficeAppName(document.file_extension) ?? "Office";

  async function handleClick() {
    const WEBDAV_BASE = import.meta.env.VITE_WEBDAV_URL;

    // Create WebDAV session (gracefully fail if proxy not deployed yet)
    if (WEBDAV_BASE) {
      try {
        await fetch(`${WEBDAV_BASE}/auth/session`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // WebDAV proxy not available yet — that's OK
      }
    }

    // Open in desktop app
    const editUrl = getEditInPlaceUrl(document);
    if (editUrl) {
      window.location.href = editUrl;
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#143A23] transition-colors hover:bg-accent/50"
    >
      Edit in {appName}
    </button>
  );
}
