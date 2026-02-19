import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/files")({
  component: Files,
});

interface DispoFile {
  id: string;
  file_name: string;
  storage_path: string | null;
  category: string | null;
  description: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

function Files() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading } = useQuery<DispoFile[]>({
    queryKey: ["dispo-files", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disposition_files")
        .select("*")
        .eq("disposition_id", dispositionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const path = `dispositions/${dispositionId}/files/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("disposition_files").insert({
        disposition_id: dispositionId,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispo-files", dispositionId] }),
  });

  const deleteFile = useMutation({
    mutationFn: async (file: DispoFile) => {
      if (file.storage_path) {
        await supabase.storage.from("documents").remove([file.storage_path]);
      }
      const { error } = await supabase.from("disposition_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispo-files", dispositionId] }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    for (const file of Array.from(selected)) {
      uploadFile.mutate(file);
    }
    e.target.value = "";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: ColumnDef<DispoFile, unknown>[] = [
    {
      accessorKey: "file_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="File Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          <span className="font-medium">{row.getValue("file_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-muted">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted">{row.getValue("description") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "file_size",
      header: "Size",
      cell: ({ row }) => <span className="text-xs text-muted">{formatFileSize(row.getValue("file_size"))}</span>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Uploaded" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteFile.mutate(row.original);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          {files.length > 0 && <p className="mt-0.5 text-sm text-muted">{files.length} files</p>}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : files.length === 0 ? (
        <EmptyState
          title="No documents"
          description="Upload contracts, disclosures, and closing documents"
          icon={<FileText className="h-12 w-12" />}
          action={
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={files} searchKey="file_name" searchPlaceholder="Search files..." />
      )}
    </div>
  );
}
