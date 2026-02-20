import { Download } from "lucide-react";
import { useState } from "react";
import type { ShareAccessData } from "@/hooks/useShareAccess";
import { useShareDownload } from "@/hooks/useShareAccess";
import { ShareFileRow } from "./ShareFileRow";

interface SharePageProps {
  data: ShareAccessData;
  token: string;
}

export function SharePage({ data, token }: SharePageProps) {
  const downloadMutation = useShareDownload();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (docId: string, filename: string) => {
    setDownloadingId(docId);
    try {
      const url = await downloadMutation.mutateAsync({ token, documentId: docId });
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } finally {
      setDownloadingId(null);
    }
  };

  const { share, documents } = data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B3022] text-xs font-bold text-white">
            TEK
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-sm text-slate-500">
            Shared by {share.created_by_name ?? "Tekton User"} · {new Date(share.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          {/* Folder name or title */}
          {share.folder_name && (
            <h2 className="text-lg font-semibold text-slate-900 mb-2">📁 {share.folder_name}</h2>
          )}

          {/* Message */}
          {share.message && (
            <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 italic">
              "{share.message}"
            </div>
          )}

          {/* Files */}
          <div className="space-y-2">
            {documents.map((doc) => (
              <ShareFileRow
                key={doc.id}
                name={doc.name}
                fileExtension={doc.file_extension}
                fileSize={doc.file_size}
                updatedAt={doc.updated_at}
                allowDownload={share.allow_download}
                onDownload={() => handleDownload(doc.id, doc.original_filename)}
                isDownloading={downloadingId === doc.id}
              />
            ))}
          </div>

          {/* Download All */}
          {share.allow_download && documents.length > 1 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B3022] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B3022]/90"
              >
                <Download className="h-4 w-4" /> Download All
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {share.expires_at && (
            <p>This link expires {new Date(share.expires_at).toLocaleDateString()}</p>
          )}
          <p className="mt-1">Powered by Tekton</p>
        </div>
      </div>
    </div>
  );
}
