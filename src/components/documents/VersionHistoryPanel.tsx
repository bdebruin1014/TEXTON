import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { formatDate, cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/documents/storage';
import type { DocumentRecord } from '@/hooks/useDocuments';

interface VersionHistoryPanelProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onDownloadVersion: (doc: DocumentRecord) => void;
  onRestoreVersion: (doc: DocumentRecord) => void;
}

export function VersionHistoryPanel({
  document,
  onClose,
  onDownloadVersion,
  onRestoreVersion,
}: VersionHistoryPanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['document-versions', document?.id],
    queryFn: async () => {
      if (!document) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('record_type', document.record_type)
        .eq('record_id', document.record_id)
        .eq('original_filename', document.original_filename)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as DocumentRecord[];
    },
    enabled: !!document,
  });

  if (!document) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 z-50 bg-white border-l border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close version history"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        {/* Document info */}
        <div className="px-4 py-3 border-b border-border bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {document.original_filename}
            </span>
          </div>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-[#143A23] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No version history available.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map((version) => {
                const isCurrent = version.id === document.id;

                return (
                  <li
                    key={version.id}
                    className={cn(
                      'px-4 py-3 hover:bg-gray-50 transition-colors',
                      isCurrent && 'bg-green-50/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              isCurrent
                                ? 'bg-[#143A23] text-white'
                                : 'bg-gray-100 text-gray-700'
                            )}
                          >
                            v{version.version}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 truncate">
                          {version.original_filename}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(version.created_at)}</span>
                          {version.file_size != null && (
                            <span>{formatFileSize(version.file_size)}</span>
                          )}
                        </div>
                        {version.uploaded_by && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            by {version.uploaded_by}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          onClick={() => onDownloadVersion(version)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-[#143A23] hover:bg-gray-100 transition-colors"
                          title="Download this version"
                          aria-label={`Download version ${version.version}`}
                        >
                          <span className="text-xs font-medium">Download</span>
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => onRestoreVersion(version)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-[#143A23] hover:bg-gray-100 transition-colors"
                            title="Restore this version"
                            aria-label={`Restore version ${version.version}`}
                          >
                            <span className="text-xs font-medium">Restore</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-gray-50">
          <p className="text-xs text-gray-500">
            {versions.length} version{versions.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>
    </>
  );
}
