import { useCallback, useRef, useState } from "react";
import { UploadSuccessAnimation } from "./UploadSuccessAnimation";

interface UploadRequestItemCardProps {
  name: string;
  description: string | null;
  isRequired: boolean;
  status: "pending" | "uploaded" | "accepted" | "rejected";
  acceptedExtensions: string[] | null;
  maxFileSize: number | null;
  fulfilledAt: string | null;
  onUpload: (file: File) => Promise<void>;
}

export function UploadRequestItemCard({
  name,
  description,
  isRequired,
  status,
  acceptedExtensions,
  maxFileSize,
  fulfilledAt,
  onUpload,
}: UploadRequestItemCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFulfilled = status === "uploaded" || status === "accepted";

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate extension
      if (acceptedExtensions?.length) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!acceptedExtensions.includes(ext)) {
          setError(`File type not accepted. Expected: ${acceptedExtensions.join(", ")}`);
          return;
        }
      }

      // Validate size
      if (maxFileSize && file.size > maxFileSize) {
        setError(`File too large. Maximum: ${(maxFileSize / 1048576).toFixed(0)} MB`);
        return;
      }

      setUploading(true);
      try {
        await onUpload(file);
        setJustUploaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [acceptedExtensions, maxFileSize, onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
            isFulfilled || justUploaded
              ? "bg-green-100 text-green-600"
              : "border-2 border-slate-300"
          }`}
        >
          {(isFulfilled || justUploaded) && <span className="text-xs">{"\u2713"}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">
            {name}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </div>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          {/* Constraints */}
          {(acceptedExtensions || maxFileSize) && !isFulfilled && !justUploaded && (
            <p className="mt-1 text-[10px] text-slate-400">
              {acceptedExtensions && `${acceptedExtensions.join(", ")} only`}
              {acceptedExtensions && maxFileSize && " · "}
              {maxFileSize && `Max ${(maxFileSize / 1048576).toFixed(0)} MB`}
            </p>
          )}
        </div>
      </div>

      {/* Upload zone or success state */}
      <div className="mt-3 ml-8">
        {justUploaded ? (
          <UploadSuccessAnimation />
        ) : isFulfilled ? (
          <div className="text-xs text-slate-500">
            Uploaded {fulfilledAt ? new Date(fulfilledAt).toLocaleDateString() : ""}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="ml-2 text-[#143A23] font-medium hover:underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragOver
                ? "border-[#143A23] bg-[#143A23]/5"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#143A23]" />
                <span className="text-xs text-slate-500">Uploading...</span>
              </div>
            ) : (
              <>
                <span className="mx-auto text-sm text-slate-400">Upload</span>
                <p className="mt-1 text-xs text-slate-500">
                  Drag & drop file here or <span className="text-[#143A23] font-medium">click to browse</span>
                </p>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedExtensions?.join(",") || undefined}
        onChange={handleInputChange}
      />
    </div>
  );
}
