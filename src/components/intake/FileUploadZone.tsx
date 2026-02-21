import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface UploadedFile {
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
}

interface FileUploadZoneProps {
  storageBucket: string;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export function FileUploadZone({ storageBucket, uploadedFiles, onFilesChange }: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);

      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(files)) {
        try {
          const path = `intake-uploads/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from(storageBucket).upload(path, file);
          if (error) {
            console.error("Upload error:", error);
            continue;
          }
          newFiles.push({
            file_name: file.name,
            storage_path: path,
            file_size: file.size,
            mime_type: file.type,
          });
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...uploadedFiles, ...newFiles]);
      }

      setIsUploading(false);
    },
    [uploadedFiles, onFilesChange, storageBucket],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const updated = uploadedFiles.filter((_, i) => i !== index);
      onFilesChange(updated);
    },
    [uploadedFiles, onFilesChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  return (
    <div className="px-1 py-2">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone requires drag event handlers */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border bg-accent/30"
        }`}
      >
        <div className="text-2xl text-muted-foreground mb-2">[+]</div>
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground">PDF, Word, Images, Excel</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.csv,.txt"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        {isUploading && <p className="mt-2 text-xs text-primary font-medium">Uploading...</p>}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {uploadedFiles.map((f, i) => (
            <div
              key={f.storage_path}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground shrink-0">[file]</span>
              <span className="truncate text-foreground flex-1">{f.file_name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {f.file_size < 1024 * 1024
                  ? `${(f.file_size / 1024).toFixed(1)} KB`
                  : `${(f.file_size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(i)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-xs"
                aria-label={`Remove ${f.file_name}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
