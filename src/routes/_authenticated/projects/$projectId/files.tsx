import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/files")({
  component: Files,
});

interface Document {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  storage_path: string | null;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

type Tab = "documents" | "insurance";

function Files() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("documents");

  const { data: documents = [], isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("record_type", "project")
        .eq("record_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const path = `projects/${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        record_type: "project",
        record_id: projectId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: path,
        category: activeTab === "insurance" ? "Insurance" : "General",
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: Document) => {
      if (doc.storage_path) {
        await supabase.storage.from("documents").remove([doc.storage_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      uploadDocument.mutate(file);
    }
    e.target.value = "";
  };

  const filteredDocs =
    activeTab === "insurance"
      ? documents.filter((d) => d.category === "Insurance")
      : documents.filter((d) => d.category !== "Insurance");

  const columns: ColumnDef<Document, unknown>[] = [
    {
      id: "type",
      cell: () => <span className="text-xs text-muted">Doc</span>,
      size: 40,
    },
    {
      accessorKey: "file_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("file_name")}</span>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("category") ?? "General"}</span>,
    },
    {
      accessorKey: "file_size",
      header: "Size",
      cell: ({ row }) => formatFileSize(row.getValue("file_size")),
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
            deleteDocument.mutate(row.original);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Files</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          
          {activeTab === "insurance" ? "Add Insurance Certificate" : "Upload Document"}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === "documents" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
        >
          Documents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("insurance")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === "insurance" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
        >
          Insurance
        </button>
      </div>

      {docsLoading ? (
        <FormSkeleton />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          title={activeTab === "insurance" ? "No insurance certificates" : "No documents"}
          description={
            activeTab === "insurance"
              ? "Upload insurance certificates for this project"
              : "Upload documents related to this project"
          }
         
          action={
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              +
              {activeTab === "insurance" ? "Add Certificate" : "Upload Document"}
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredDocs} searchKey="file_name" searchPlaceholder="Search files..." />
      )}
    </div>
  );
}
