import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate, getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/permits")({
  component: Permits,
});

interface Permit {
  id: string;
  permit_type: string;
  permit_number: string | null;
  issuing_authority: string | null;
  applied_date: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  fee: number | null;
  status: string;
  notes: string | null;
}

const PERMIT_TYPES = [
  "Building Permit",
  "Grading Permit",
  "Electrical Permit",
  "Plumbing Permit",
  "Mechanical Permit",
  "Demolition Permit",
  "Right-of-Way",
  "Encroachment",
  "Fire",
  "Other",
] as const;

function Permits() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["permits", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permits")
        .select("*")
        .eq("job_id", jobId)
        .order("applied_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPermit = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("permits").insert({
        job_id: jobId,
        permit_type: values.permit_type || "Building Permit",
        status: "Not Applied",
        permit_number: values.permit_number || null,
        applied_date: values.applied_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits", jobId] });
      toast.success("Permit added");
      setShowModal(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to add permit"),
  });

  const updatePermit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("permits").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permits", jobId] }),
  });

  const deletePermit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permits", jobId] }),
  });

  const issuedCount = permits.filter((p) => p.status === "Issued").length;

  const columns: ColumnDef<Permit, unknown>[] = [
    {
      accessorKey: "permit_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <select
            value={item.permit_type}
            onChange={(e) => {
              e.stopPropagation();
              updatePermit.mutate({ id: item.id, updates: { permit_type: e.target.value } });
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs font-medium outline-none"
          >
            {PERMIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: "permit_number",
      header: "Permit #",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("permit_number") ?? "—"}</span>,
    },
    {
      accessorKey: "issuing_authority",
      header: "Authority",
      cell: ({ row }) => <span className="text-muted">{row.getValue("issuing_authority") ?? "—"}</span>,
    },
    {
      accessorKey: "applied_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Applied" />,
      cell: ({ row }) => formatDate(row.getValue("applied_date")),
    },
    {
      accessorKey: "issued_date",
      header: "Issued",
      cell: ({ row }) => formatDate(row.getValue("issued_date")),
    },
    {
      accessorKey: "expiration_date",
      header: "Expires",
      cell: ({ row }) => {
        const val = row.getValue("expiration_date") as string | null;
        if (!val) return "—";
        const isExpired = new Date(val) < new Date();
        return <span className={isExpired ? "text-xs text-destructive" : ""}>{formatDate(val)}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <select
            value={item.status}
            onChange={(e) => {
              e.stopPropagation();
              const updates: Record<string, unknown> = { status: e.target.value };
              if (e.target.value === "Issued" && !item.issued_date) {
                updates.issued_date = new Date().toISOString().split("T")[0];
              }
              updatePermit.mutate({ id: item.id, updates });
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
          >
            <option value="Not Applied">Not Applied</option>
            <option value="Applied">Applied</option>
            <option value="Under Review">Under Review</option>
            <option value="Issued">Issued</option>
            <option value="Expired">Expired</option>
            <option value="Denied">Denied</option>
          </select>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePermit.mutate(row.original.id);
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
          <h2 className="text-lg font-semibold text-foreground">Permits</h2>
          {permits.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {issuedCount} of {permits.length} issued
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Permit
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Permit"
        fields={[
          {
            name: "permit_type",
            label: "Permit type",
            type: "select",
            required: true,
            options: ["Building", "Electrical", "Plumbing", "Mechanical", "Grading", "Other"],
          },
          { name: "permit_number", label: "Permit number", type: "text" },
          { name: "applied_date", label: "Applied date", type: "date" },
        ]}
        onSubmit={async (values) => {
          addPermit.mutate(values);
        }}
        loading={addPermit.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : permits.length === 0 ? (
        <EmptyState title="No permits" description="Track building permits and approvals" />
      ) : (
        <DataTable columns={columns} data={permits} searchKey="permit_type" searchPlaceholder="Search permits..." />
      )}
    </div>
  );
}
