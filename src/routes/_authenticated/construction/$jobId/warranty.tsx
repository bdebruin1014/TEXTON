import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/warranty")({
  component: Warranty,
});

interface WarrantyClaim {
  id: string;
  claim_number: string | null;
  description: string;
  category: string | null;
  reported_by: string | null;
  reported_date: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  status: string;
  notes: string | null;
}

function Warranty() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: claims = [], isLoading } = useQuery<WarrantyClaim[]>({
    queryKey: ["warranty-claims", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_claims")
        .select("*")
        .eq("job_id", jobId)
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addClaim = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = claims.length + 1;
      const { error } = await supabase.from("warranty_claims").insert({
        job_id: jobId,
        claim_number: `WC-${String(count).padStart(3, "0")}`,
        description: values.description || "New Warranty Claim",
        reported_date: values.reported_date || new Date().toISOString().split("T")[0],
        status: "Open",
        category: values.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-claims", jobId] });
      toast.success("Warranty claim created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create warranty claim"),
  });

  const deleteClaim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warranty_claims").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warranty-claims", jobId] }),
  });

  const openCount = claims.filter((c) => c.status === "Open").length;
  const inProgressCount = claims.filter((c) => c.status === "In Progress").length;

  const columns: ColumnDef<WarrantyClaim, unknown>[] = [
    {
      accessorKey: "claim_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Claim #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("claim_number") ?? "—"}</span>,
      size: 100,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-muted">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "reported_by",
      header: "Reported By",
      cell: ({ row }) => <span className="text-muted">{row.getValue("reported_by") ?? "—"}</span>,
    },
    {
      accessorKey: "reported_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reported" />,
      cell: ({ row }) => formatDate(row.getValue("reported_date")),
    },
    {
      accessorKey: "scheduled_date",
      header: "Scheduled",
      cell: ({ row }) => formatDate(row.getValue("scheduled_date")),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteClaim.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Warranty Claims</h2>
          {claims.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {openCount} open · {inProgressCount} in progress · {claims.length} total
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Claim
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Warranty Claim"
        fields={[
          { name: "description", label: "Description", type: "text", required: true },
          {
            name: "reported_date",
            label: "Reported date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
          },
          {
            name: "category",
            label: "Category",
            type: "select",
            options: ["Structural", "Mechanical", "Electrical", "Plumbing", "Cosmetic", "Other"],
          },
        ]}
        onSubmit={async (values) => {
          addClaim.mutate(values);
        }}
        loading={addClaim.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : claims.length === 0 ? (
        <EmptyState title="No warranty claims" description="Track post-closing warranty claims and repairs" />
      ) : (
        <DataTable columns={columns} data={claims} searchKey="description" searchPlaceholder="Search claims..." />
      )}
    </div>
  );
}
