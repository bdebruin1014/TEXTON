import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/insurance")({
  component: Insurance,
});

interface InsuranceCert {
  id: string;
  policy_type: string;
  carrier: string | null;
  policy_number: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  status: string;
}

function Insurance() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: certs = [], isLoading } = useQuery<InsuranceCert[]>({
    queryKey: ["insurance-certs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_certificates")
        .select("*")
        .eq("project_id", projectId)
        .order("expiration_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("insurance_certificates").insert({
        project_id: projectId,
        policy_type: "General Liability",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance-certs", projectId] }),
  });

  const deleteCert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance-certs", projectId] }),
  });

  const columns: ColumnDef<InsuranceCert, unknown>[] = [
    {
      accessorKey: "policy_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("policy_type")}</span>,
    },
    {
      accessorKey: "carrier",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Carrier" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("carrier") ?? "—"}</span>,
    },
    {
      accessorKey: "policy_number",
      header: "Policy #",
      cell: ({ row }) => <span className="text-muted">{row.getValue("policy_number") ?? "—"}</span>,
    },
    {
      accessorKey: "coverage_amount",
      header: "Coverage",
      cell: ({ row }) => {
        const val = row.getValue("coverage_amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "effective_date",
      header: "Effective",
      cell: ({ row }) => formatDate(row.getValue("effective_date")),
    },
    {
      accessorKey: "expiration_date",
      header: "Expires",
      cell: ({ row }) => formatDate(row.getValue("expiration_date")),
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
            deleteCert.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        ></button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Insurance</h2>
        <button
          type="button"
          onClick={() => addCert.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Insurance Certificate
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : certs.length === 0 ? (
        <EmptyState title="No insurance certificates" description="Track insurance policies for this project" />
      ) : (
        <DataTable columns={columns} data={certs} searchKey="policy_type" searchPlaceholder="Search insurance..." />
      )}
    </div>
  );
}
