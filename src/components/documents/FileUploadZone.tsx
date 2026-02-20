import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/useDocuments";

interface FileUploadZoneProps {
  folderId: string | null;
  folderPath: string | null;
  recordType: string;
  recordId: string;
  children: React.ReactNode;
  className?: string;
}

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

export function FileUploadZone({
  folderId,
  folderPath,
  recordType,
  recordId,
  children,
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const uploadDoc = useUploadDocument();
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newUploads: UploadProgress[] = fileArray.map((f) => ({
        name: f.name,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      fileArray.forEach((file, i) => {
        uploadDoc.mutate(
          { file, recordType, recordId, folderId, folderPath },
          {
            onSuccess: () => {
              setUploads((prev) =>
                prev.map((u, j) => (j === prev.length - fileArray.length + i ? { ...u, status: "done", progress: 100 } : u)),
              );
              setTimeout(() => {
                setUploads((prev) => prev.filter((u) => u.status !== "done"));
              }, 2000);
            },
            onError: () => {
              setUploads((prev) =>
                prev.map((u, j) => (j === prev.length - fileArray.length + i ? { ...u, status: "error" } : u)),
              );
            },
          },
        );
      });
    },
    [uploadDoc, recordType, recordId, folderId, folderPath],
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-[#1B3022] bg-[#1B3022]/5">
          <div className="flex flex-col items-center gap-2 text-[#1B3022]">
            <span className="text-lg font-bold">Upload</span>
            <span className="text-sm font-medium">Drop files to upload</span>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="absolute bottom-4 right-4 z-40 w-72 space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="rounded-lg border border-border bg-white p-3 shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="truncate text-xs font-medium text-foreground">{u.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {u.status === "uploading" ? "Uploading..." : u.status === "done" ? "Done" : "Error"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-accent/30">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    u.status === "error" ? "bg-destructive" : "bg-[#1B3022]",
                  )}
                  style={{ width: u.status === "uploading" ? "60%" : "100%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
