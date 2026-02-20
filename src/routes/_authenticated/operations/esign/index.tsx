import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { IndexSidebar, type SidebarFilterItem } from "@/components/layout/IndexSidebar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { ESIGN_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/esign/")({
  component: EsignIndex,
});

interface EsignDocument {
  id: string;
  name: string;
  template_id: string | null;
  status: string;
  connected_record_type: string | null;
  connected_record_id: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const columns: ColumnDef<EsignDocument, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Document Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "connected_record_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Record Type" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("connected_record_type") ?? "—"}</span>,
  },
  {
    accessorKey: "sent_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sent" />,
    cell: ({ row }) => {
      const val = row.getValue("sent_at") as string | null;
      return val ? formatDate(val) : "—";
    },
  },
  {
    accessorKey: "completed_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" />,
    cell: ({ row }) => {
      const val = row.getValue("completed_at") as string | null;
      return val ? formatDate(val) : "—";
    },
  },
];

function EsignIndex() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: documents = [], isLoading } = useQuery<EsignDocument[]>({
    queryKey: ["esign-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esign_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDocument = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("esign_documents")
        .insert({ name: "New E-Sign Document", status: "Draft" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
      if (data?.id) {
        navigate({ to: `/operations/esign/${data.id}` as string });
      }
    },
  });

  const filteredDocuments = useMemo(() => {
    if (activeFilter === "all") return documents;
    return documents.filter((d) => d.status === activeFilter);
  }, [documents, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      counts[doc.status] = (counts[doc.status] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  const sidebarFilters: SidebarFilterItem[] = [
    { label: "All Documents", value: "all", count: documents.length },
    ...ESIGN_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const sidebar = (
    <IndexSidebar
      title="E-Sign"
      filters={sidebarFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      metrics={[
        { label: "Total", value: documents.length },
        { label: "Pending", value: documents.filter((d) => d.status === "Sent" || d.status === "Viewed").length },
        { label: "Completed", value: documents.filter((d) => d.status === "Completed").length },
      ]}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">E-Sign Documents</h1>
            <p className="mt-0.5 text-sm text-muted">{activeFilter === "all" ? "All documents" : activeFilter}</p>
          </div>
          <button
            type="button"
            onClick={() => addDocument.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New E-Sign
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            title="No e-sign documents"
            description="Create a new document to start collecting signatures"
            action={
              <button
                type="button"
                onClick={() => addDocument.mutate()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                New E-Sign
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredDocuments}
            searchKey="name"
            searchPlaceholder="Search documents..."
            onRowClick={(row) => navigate({ to: `/operations/esign/${row.id}` as string })}
          />
        )}
      </div>
    </PageWithSidebar>
  );
}
