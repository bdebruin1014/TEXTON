import { FileText, FolderPlus, Search, Send, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { useCreateFolder, useDeleteFolder, useDocumentFolders, useRenameFolder } from "@/hooks/useDocumentFolders";
import {
  useArchiveDocument,
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  useMoveDocument,
  useRenameDocument,
  useUploadDocument,
} from "@/hooks/useDocuments";
import type { DocumentRecord } from "@/hooks/useDocuments";
import { formatFileSize } from "@/lib/documents/storage";
import { getEditInPlaceUrl } from "@/lib/documents/webdav";
import { ActivityLog } from "./ActivityLog";
import { BulkActionBar } from "./BulkActionBar";
import { FileList } from "./FileList";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileUploadZone } from "./FileUploadZone";
import { FolderTree } from "./FolderTree";
import { GenerateDocumentModal } from "./GenerateDocumentModal";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import { NewFolderDialog } from "./NewFolderDialog";
import { ShareDialog } from "./sharing/ShareDialog";
import { UploadRequestDialog } from "./sharing/UploadRequestDialog";
import { VersionHistoryPanel } from "./VersionHistoryPanel";

interface DocumentBrowserProps {
  recordType: "project" | "job" | "disposition" | "opportunity" | "entity" | "contact";
  recordId: string;
}

export function DocumentBrowser({ recordType, recordId }: DocumentBrowserProps) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState<string | null | false>(false);
  const [moveDocId, setMoveDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentRecord | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState<{
    type: "folder" | "selection";
    folderId?: string | null;
    folderName?: string;
    documents?: DocumentRecord[];
  } | null>(null);
  const [showUploadRequest, setShowUploadRequest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders = [], isLoading: foldersLoading } = useDocumentFolders(recordType, recordId);
  const { data: documents = [], isLoading: docsLoading } = useDocuments(recordType, recordId, activeFolderId);

  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const uploadDoc = useUploadDocument();
  const downloadDoc = useDownloadDocument();
  const renameDoc = useRenameDocument();
  const moveDoc = useMoveDocument();
  const archiveDoc = useArchiveDocument();
  const deleteDoc = useDeleteDocument();

  // Build folder path for storage
  const getFolderPath = useCallback(
    (folderId: string | null): string | null => {
      if (!folderId) return null;
      const parts: string[] = [];
      let current = folders.find((f) => f.id === folderId);
      while (current) {
        parts.unshift(current.slug);
        current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) : undefined;
      }
      return parts.join("/");
    },
    [folders],
  );

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const trail: { id: string | null; name: string }[] = [{ id: null, name: "All Documents" }];
    if (activeFolderId) {
      const parts: { id: string; name: string }[] = [];
      let current = folders.find((f) => f.id === activeFolderId);
      while (current) {
        parts.unshift({ id: current.id, name: current.name });
        current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) : undefined;
      }
      trail.push(...parts);
    }
    return trail;
  }, [activeFolderId, folders]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) => d.name.toLowerCase().includes(q) || d.original_filename.toLowerCase().includes(q),
    );
  }, [documents, searchQuery]);

  // Total size
  const totalSize = useMemo(() => documents.reduce((sum, d) => sum + (d.file_size ?? 0), 0), [documents]);

  const handleNewFolder = (name: string) => {
    const parentId = showNewFolder === false ? null : (showNewFolder as string | null);
    createFolder.mutate({ name, parent_id: parentId, record_type: recordType, record_id: recordId });
    setShowNewFolder(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const folderPath = getFolderPath(activeFolderId);
    for (const file of Array.from(files)) {
      uploadDoc.mutate({ file, recordType, recordId, folderId: activeFolderId, folderPath });
    }
    e.target.value = "";
  };

  const handleEditInPlace = (doc: DocumentRecord) => {
    const editUrl = getEditInPlaceUrl(doc);
    if (editUrl) {
      window.location.href = editUrl;
    }
  };

  if (foldersLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-lg border border-border bg-white">
      {/* Left: Folder Tree */}
      <div className="w-60 shrink-0 border-r border-border bg-white">
        <FolderTree
          folders={folders}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
          onRename={(id, name) => renameFolder.mutate({ id, name })}
          onDelete={(id) => deleteFolder.mutate(id)}
          onAddFolder={(parentId) => setShowNewFolder(parentId)}
          onShareFolder={(folderId, folderName) =>
            setShowShareDialog({ type: "folder", folderId, folderName })
          }
        />
        {showNewFolder !== false && (
          <div className="px-2 pb-2">
            <NewFolderDialog onSubmit={handleNewFolder} onCancel={() => setShowNewFolder(false)} />
          </div>
        )}
      </div>

      {/* Right: File List */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            {breadcrumb.map((item, i) => (
              <span key={item.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <button
                  type="button"
                  onClick={() => setActiveFolderId(item.id)}
                  className={
                    i === breadcrumb.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-40 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* New Folder */}
          <button
            type="button"
            onClick={() => setShowNewFolder(activeFolderId)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>

          {/* Generate */}
          <button
            type="button"
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            <FileText className="h-3.5 w-3.5" />
            Generate
          </button>

          {/* Request Upload */}
          <button
            type="button"
            onClick={() => setShowUploadRequest(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            <Send className="h-3.5 w-3.5" />
            Request Upload
          </button>

          {/* Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-button px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Bulk action bar */}
        {selectedFileIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedFileIds.size}
            onShare={() => {
              const selectedDocs = documents.filter((d) => selectedFileIds.has(d.id));
              setShowShareDialog({ type: "selection", documents: selectedDocs });
            }}
            onMove={() => {
              const firstId = Array.from(selectedFileIds)[0];
              if (firstId) setMoveDocId(firstId);
            }}
            onDelete={() => {
              if (confirm(`Delete ${selectedFileIds.size} file(s)?`)) {
                for (const id of selectedFileIds) {
                  const doc = documents.find((d) => d.id === id);
                  if (doc) deleteDoc.mutate({ id: doc.id, bucket: doc.bucket, storage_path: doc.storage_path });
                }
                setSelectedFileIds(new Set());
              }
            }}
            onDownload={() => {
              for (const id of selectedFileIds) {
                const doc = documents.find((d) => d.id === id);
                if (doc) downloadDoc.mutate(doc);
              }
            }}
            onClear={() => setSelectedFileIds(new Set())}
          />
        )}

        {/* File list with drop zone */}
        <FileUploadZone
          folderId={activeFolderId}
          folderPath={getFolderPath(activeFolderId)}
          recordType={recordType}
          recordId={recordId}
          className="flex-1 overflow-y-auto"
        >
          <FileList
            documents={filteredDocs}
            isLoading={docsLoading}
            selectedIds={selectedFileIds}
            onSelectionChange={setSelectedFileIds}
            onDownload={(doc) => downloadDoc.mutate(doc)}
            onRename={(id, name) => renameDoc.mutate({ id, name })}
            onMove={(id) => setMoveDocId(id)}
            onArchive={(id) => archiveDoc.mutate(id)}
            onDelete={(doc) => {
              if (confirm(`Delete "${doc.name}"?`)) {
                deleteDoc.mutate({ id: doc.id, bucket: doc.bucket, storage_path: doc.storage_path });
              }
            }}
            onEditInPlace={handleEditInPlace}
            onPreview={(doc) => setPreviewDoc(doc)}
            onVersionHistory={(doc) => setVersionDoc(doc)}
            onShare={(doc) => setShowShareDialog({ type: "selection", documents: [doc] })}
          />
        </FileUploadZone>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            {documents.length} document{documents.length !== 1 ? "s" : ""} · {formatFileSize(totalSize)} total
          </span>
          <button
            type="button"
            onClick={() => setShowActivity(!showActivity)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showActivity ? "Hide Activity" : "Activity Log"}
          </button>
        </div>

        {/* Activity Log (collapsible) */}
        {showActivity && (
          <div className="max-h-48 overflow-y-auto border-t border-border bg-gray-50 px-4 py-3">
            <ActivityLog recordType={recordType} recordId={recordId} />
          </div>
        )}
      </div>

      {/* Move dialog */}
      {moveDocId && (
        <MoveToFolderDialog
          folders={folders}
          currentFolderId={documents.find((d) => d.id === moveDocId)?.folder_id ?? null}
          onMove={(folderId) => {
            moveDoc.mutate({ documentId: moveDocId, folderId });
            setMoveDocId(null);
          }}
          onClose={() => setMoveDocId(null)}
        />
      )}

      {/* File preview modal */}
      <FilePreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={(doc: DocumentRecord) => downloadDoc.mutate(doc)}
        onEditInPlace={handleEditInPlace}
      />

      {/* Version history panel */}
      <VersionHistoryPanel
        document={versionDoc}
        onClose={() => setVersionDoc(null)}
        onDownloadVersion={(doc: DocumentRecord) => downloadDoc.mutate(doc)}
        onRestoreVersion={(doc: DocumentRecord) => {
          // Restore creates a copy as the new current version
          uploadDoc.mutate({
            file: new File([], doc.original_filename),
            recordType,
            recordId,
            folderId: activeFolderId,
            folderPath: getFolderPath(activeFolderId),
          });
          setVersionDoc(null);
        }}
      />

      {/* Generate document modal */}
      {showGenerate && (
        <GenerateDocumentModal
          recordType={recordType}
          recordId={recordId}
          folderId={activeFolderId}
          onClose={() => setShowGenerate(false)}
          onGenerated={() => setShowGenerate(false)}
        />
      )}

      {/* Share dialog */}
      {showShareDialog && (
        <ShareDialog
          open
          onClose={() => setShowShareDialog(null)}
          recordType={recordType}
          recordId={recordId}
          shareType={showShareDialog.type}
          folderId={showShareDialog.folderId}
          folderName={showShareDialog.folderName}
          documents={showShareDialog.documents}
        />
      )}

      {/* Upload request dialog */}
      <UploadRequestDialog
        open={showUploadRequest}
        onClose={() => setShowUploadRequest(false)}
        recordType={recordType}
        recordId={recordId}
        folders={folders}
      />
    </div>
  );
}
