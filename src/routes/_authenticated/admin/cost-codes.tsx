import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/cost-codes")({
  component: CostCodes,
});

interface CostCode {
  id: string;
  code: string;
  description: string | null;
  category: string | null;
  division: string | null;
  status: string;
}

function CostCodes() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: codes = [], isLoading } = useQuery<CostCode[]>({
    queryKey: ["cost-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_codes").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCode = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("cost_codes").insert({
        code: values.code,
        description: values.description,
        category: values.category || null,
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-codes"] });
      toast.success("Cost code added");
    },
    onError: () => {
      toast.error("Failed to add cost code");
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Placeholder: parse CSV and bulk insert
    }
    e.target.value = "";
  };

  const columns: ColumnDef<CostCode, unknown>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const val = row.getValue("category") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
      },
    },
    {
      accessorKey: "division",
      header: "Division",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("division") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color = status === "Active" ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cost Codes</h1>
          <p className="mt-0.5 text-sm text-muted">{codes.length} standardized cost codes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            Import Cost Codes
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Cost Code
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : codes.length === 0 ? (
        <EmptyState title="No cost codes" description="Add or import standardized cost codes for job costing" />
      ) : (
        <DataTable columns={columns} data={codes} searchKey="description" searchPlaceholder="Search cost codes..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Cost Code"
        fields={[
          { name: "code", label: "Cost code", type: "text", required: true },
          { name: "description", label: "Description", type: "text", required: true },
          {
            name: "category",
            label: "Category",
            type: "select",
            options: ["Hard Costs", "Soft Costs", "Land", "Fees", "Overhead", "Other"],
          },
        ]}
        onSubmit={async (values) => {
          await addCode.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addCode.isPending}
      />
    </div>
  );
}
