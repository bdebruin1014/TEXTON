import { useEffect, useState, useCallback } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { getSignedUrl, formatFileSize } from '@/lib/documents/storage';
import { getOfficeAppName } from '@/lib/documents/webdav';
import { getFileIcon } from '@/lib/documents/icons';
import type { DocumentRecord } from '@/hooks/useDocuments';

function FileLabel({ label, className }: { label: string; className?: string }) {
  return <span className={cn("font-bold", className)}>{label}</span>;
}

interface FilePreviewModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onDownload: (doc: DocumentRecord) => void;
  onEditInPlace: (doc: DocumentRecord) => void;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const OFFICE_EXTENSIONS = ['.docx', '.xlsx', '.pptx'];

function normalizeExtension(ext: string | null | undefined): string {
  if (!ext) return '';
  return ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
}

function isImage(ext: string | null | undefined): boolean {
  return IMAGE_EXTENSIONS.includes(normalizeExtension(ext));
}

function isPdf(ext: string | null | undefined): boolean {
  return normalizeExtension(ext) === '.pdf';
}

function isOfficeFile(ext: string | null | undefined): boolean {
  return OFFICE_EXTENSIONS.includes(normalizeExtension(ext));
}

export function FilePreviewModal({
  document,
  onClose,
  onDownload,
  onEditInPlace,
}: FilePreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch signed URL when document changes
  useEffect(() => {
    if (!document) {
      setSignedUrl(null);
      setImageZoomed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSignedUrl(document.bucket, document.storage_path).then((url) => {
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSignedUrl(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [document]);

  // Close on Escape key
  useEffect(() => {
    if (!document) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!document) return null;

  const ext = normalizeExtension(document.file_extension);
  const iconConfig = getFileIcon(document.file_extension);
  const officeAppName = isOfficeFile(document.file_extension)
    ? getOfficeAppName(document.file_extension)
    : null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading preview...</div>
        </div>
      );
    }

    // PDF preview
    if (isPdf(document.file_extension) && signedUrl) {
      return (
        <div className="flex-1 min-h-0">
          <iframe
            src={signedUrl}
            title={document.name}
            className="w-full h-full rounded-b-none"
          />
        </div>
      );
    }

    // Image preview
    if (isImage(document.file_extension) && signedUrl) {
      return (
        <div
          className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 overflow-auto p-4"
          onClick={() => setImageZoomed((z) => !z)}
        >
          <img
            src={signedUrl}
            alt={document.name}
            className={cn(
              'transition-transform duration-200',
              imageZoomed
                ? 'max-w-none cursor-zoom-out'
                : 'max-w-full max-h-full object-contain cursor-zoom-in',
            )}
          />
        </div>
      );
    }

    // Office files — metadata card with Edit in Office
    if (isOfficeFile(document.file_extension)) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md rounded-lg border border-border bg-gray-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-border">
              <FileLabel label={iconConfig.label} className="text-lg text-[#143A23]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {document.name}
            </h3>
            <p className="text-sm text-gray-500 mb-1 uppercase">{ext.replace('.', '')} Document</p>
            {document.file_size != null && (
              <p className="text-sm text-gray-500 mb-1">
                {formatFileSize(document.file_size)}
              </p>
            )}
            {document.updated_at && (
              <p className="text-sm text-gray-500">
                Modified {formatDate(document.updated_at)}
              </p>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onEditInPlace(document)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#143A23] px-4 py-2 text-sm font-medium text-white hover:bg-[#143A23]/90 transition-colors"
              >
                Edit in {officeAppName}
              </button>
              <button
                type="button"
                onClick={() => onDownload(document)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Other file types — metadata card with Download only
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-border">
            <FileLabel label={iconConfig.label} className="text-lg text-[#143A23]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {document.name}
          </h3>
          <p className="text-sm text-gray-500 mb-1 uppercase">
            {ext ? ext.replace('.', '') : 'Unknown'} File
          </p>
          {document.file_size != null && (
            <p className="text-sm text-gray-500 mb-1">
              {formatFileSize(document.file_size)}
            </p>
          )}
          {document.updated_at && (
            <p className="text-sm text-gray-500">
              Modified {formatDate(document.updated_at)}
            </p>
          )}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => onDownload(document)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="rounded-xl bg-white shadow-xl max-w-4xl max-h-[85vh] w-full flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileLabel label={iconConfig.label} className="text-sm text-[#143A23] shrink-0" />
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {document.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close preview"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Footer — shown for PDF and image previews */}
        {(isPdf(document.file_extension) || isImage(document.file_extension)) && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-3 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(document)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
