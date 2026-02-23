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
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/showings")({
  component: Showings,
});

interface Showing {
  id: string;
  showing_date: string | null;
  showing_time: string | null;
  agent_name: string | null;
  buyer_name: string | null;
  feedback: string | null;
  rating: number | null;
  follow_up: string | null;
}

function Showings() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: showings = [], isLoading } = useQuery<Showing[]>({
    queryKey: ["showings", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showings")
        .select("*")
        .eq("disposition_id", dispositionId)
        .order("showing_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addShowing = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("showings").insert({
        disposition_id: dispositionId,
        showing_date: values.showing_date || new Date().toISOString().split("T")[0],
        showing_time: values.showing_time || null,
        agent_name: values.agent_name || null,
        feedback: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showings", dispositionId] });
      toast.success("Showing added");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add showing"),
  });

  const deleteShowing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("showings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["showings", dispositionId] }),
  });

  const columns: ColumnDef<Showing, unknown>[] = [
    {
      accessorKey: "showing_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("showing_date"))}</span>,
    },
    {
      accessorKey: "showing_time",
      header: "Time",
      cell: ({ row }) => <span className="text-muted">{row.getValue("showing_time") ?? "—"}</span>,
    },
    {
      accessorKey: "agent_name",
      header: "Agent",
      cell: ({ row }) => <span className="text-muted">{row.getValue("agent_name") ?? "—"}</span>,
    },
    {
      accessorKey: "buyer_name",
      header: "Buyer",
      cell: ({ row }) => <span className="text-muted">{row.getValue("buyer_name") ?? "—"}</span>,
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const val = row.getValue("rating") as number | null;
        if (!val) return "—";
        const stars = "★".repeat(val) + "☆".repeat(5 - val);
        return <span className="text-xs text-warning">{stars}</span>;
      },
    },
    {
      accessorKey: "feedback",
      header: "Feedback",
      cell: ({ row }) => {
        const val = row.getValue("feedback") as string | null;
        return <span className="max-w-[200px] truncate text-sm text-muted">{val ?? "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteShowing.mutate(row.original.id);
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
          <h2 className="text-lg font-semibold text-foreground">Showings</h2>
          {showings.length > 0 && <p className="mt-0.5 text-sm text-muted">{showings.length} showings</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Showing
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Showing"
        fields={[
          { name: "showing_date", label: "Showing date", type: "date", required: true },
          { name: "showing_time", label: "Time", type: "text", placeholder: "2:00 PM" },
          { name: "agent_name", label: "Agent name", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          addShowing.mutate(values);
        }}
        loading={addShowing.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : showings.length === 0 ? (
        <EmptyState title="No showings" description="Track property showings, feedback, and ratings" />
      ) : (
        <DataTable columns={columns} data={showings} searchKey="agent_name" searchPlaceholder="Search showings..." />
      )}
    </div>
  );
}
