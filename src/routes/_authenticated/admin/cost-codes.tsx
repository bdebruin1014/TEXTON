import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Upload } from "lucide-react";
import { useRef } from "react";
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

  const { data: codes = [], isLoading } = useQuery<CostCode[]>({
    queryKey: ["cost-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_codes").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCode = useMutation({
    mutationFn: async () => {
      const nextNum = codes.length + 1;
      const { error } = await supabase.from("cost_codes").insert({
        code: String(nextNum).padStart(4, "0"),
        description: "New Cost Code",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cost-codes"] }),
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Placeholder: parse CSV and bulk insert
      console.log("Import cost codes from:", file.name);
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
        return val ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
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
        const color = status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600";
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
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import Cost Codes
          </button>
          <button
            type="button"
            onClick={() => addCode.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Add Cost Code
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
    </div>
  );
}
