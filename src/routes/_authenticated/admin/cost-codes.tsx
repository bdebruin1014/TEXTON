import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import Papa from "papaparse";
import { useCallback, useRef, useState } from "react";
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

const VALID_CATEGORIES = ["Hard Costs", "Soft Costs", "Land", "Fees", "Overhead", "Other"];

// ---------------------------------------------------------------------------
// Parsed CSV row with validation state
// ---------------------------------------------------------------------------
interface ImportRow {
  code: string;
  description: string;
  category: string;
  status: string;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Template download helper
// ---------------------------------------------------------------------------
function downloadTemplate() {
  const header = "code,description,category\n";
  const example =
    '"01-100","Site Work - Clearing","Hard Costs"\n' +
    '"01-200","Site Work - Grading","Hard Costs"\n' +
    '"02-100","Foundation - Footings","Hard Costs"\n';
  const csv = header + example;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cost-codes-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function CostCodes() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

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

  // ── CSV validation ──────────────────────────────────────────────────────
  const validateRows = useCallback(
    (
      rows: Array<Record<string, string>>,
    ): ImportRow[] => {
      const existingCodes = new Set(codes.map((c) => c.code.toLowerCase()));
      const seenInFile = new Set<string>();

      return rows.map((raw) => {
        const errors: string[] = [];
        const code = (raw.code ?? "").trim();
        const description = (raw.description ?? raw.name ?? "").trim();
        const category = (raw.category ?? "").trim();

        if (!code) errors.push("Code is required");
        if (!description) errors.push("Description is required");
        if (category && !VALID_CATEGORIES.includes(category)) {
          errors.push(`Invalid category "${category}"`);
        }
        if (code && existingCodes.has(code.toLowerCase())) {
          errors.push("Duplicate: code already exists in database");
        }
        if (code && seenInFile.has(code.toLowerCase())) {
          errors.push("Duplicate: code appears multiple times in file");
        }
        if (code) seenInFile.add(code.toLowerCase());

        return {
          code,
          description,
          category: category || "",
          status: "Active",
          errors,
        };
      });
    },
    [codes],
  );

  // ── File selection handler ──────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("CSV has no data rows");
          return;
        }
        const validated = validateRows(results.data);
        setImportRows(validated);
        setShowImportPanel(true);
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  };

  // ── Bulk import ─────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    const validRows = importRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setImporting(true);
    try {
      const { error } = await supabase.from("cost_codes").insert(
        validRows.map((row) => ({
          code: row.code,
          description: row.description,
          category: row.category || null,
          status: "Active",
        })),
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cost-codes"] });
      toast.success(`Imported ${validRows.length} cost code(s)`);
      setShowImportPanel(false);
      setImportRows([]);
    } catch {
      toast.error("Failed to import cost codes");
    } finally {
      setImporting(false);
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────
  const columns: ColumnDef<CostCode, unknown>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description") ?? "\u2014"}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const val = row.getValue("category") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "\u2014";
      },
    },
    {
      accessorKey: "division",
      header: "Division",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("division") ?? "\u2014"}</span>,
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

  const validCount = importRows.filter((r) => r.errors.length === 0).length;
  const errorCount = importRows.length - validCount;

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
            onClick={() => {
              setImportRows([]);
              setShowImportPanel(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Cost Code
          </button>
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
            options: VALID_CATEGORIES,
          },
        ]}
        onSubmit={async (values) => {
          await addCode.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addCode.isPending}
      />

      {/* ── Import CSV slide-over panel ──────────────────────────────────── */}
      {showImportPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowImportPanel(false)}
            aria-label="Close import panel"
          />
          <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Import Cost Codes</h2>
                <p className="mt-0.5 text-sm text-muted">Upload a CSV file to bulk-import cost codes</p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportPanel(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-foreground"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Step 1: Template + Upload */}
              {importRows.length === 0 ? (
                <div className="space-y-6">
                  {/* Template download */}
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">1. Download template</h3>
                    <p className="mt-1 text-xs text-muted">
                      CSV with columns: <span className="font-mono">code</span> (required),{" "}
                      <span className="font-mono">description</span> (required),{" "}
                      <span className="font-mono">category</span> (required:{" "}
                      {VALID_CATEGORIES.join(", ")})
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-card-hover"
                    >
                      Download Template CSV
                    </button>
                  </div>

                  {/* File upload zone */}
                  <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40">
                    <h3 className="text-sm font-semibold text-foreground">2. Upload your CSV</h3>
                    <p className="mt-1 text-xs text-muted">Click to select or drag-and-drop a .csv file</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
                    >
                      Select CSV File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              ) : (
                /* Step 2: Preview table */
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{importRows.length} rows parsed</span>
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                      {validCount} valid
                    </span>
                    {errorCount > 0 && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {errorCount} with errors
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-accent/30 text-left text-xs font-medium uppercase text-muted">
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Code</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row, idx) => {
                          const hasErrors = row.errors.length > 0;
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-border last:border-0 ${hasErrors ? "bg-destructive/5" : ""}`}
                            >
                              <td className="px-3 py-2 font-mono text-xs text-muted">{idx + 1}</td>
                              <td className="px-3 py-2">
                                {hasErrors ? (
                                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    Error
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                                    Valid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{row.code || "\u2014"}</td>
                              <td className="px-3 py-2 text-xs">{row.description || "\u2014"}</td>
                              <td className="px-3 py-2 text-xs">{row.category || "\u2014"}</td>
                              <td className="px-3 py-2 text-xs text-destructive">
                                {row.errors.join("; ")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Re-upload link */}
                  <button
                    type="button"
                    onClick={() => {
                      setImportRows([]);
                    }}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Upload a different file
                  </button>
                </div>
              )}
            </div>

            {/* Panel footer (only when rows are loaded) */}
            {importRows.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowImportPanel(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={importing || validCount === 0}
                  className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
                >
                  {importing ? "Importing..." : `Import ${validCount} Cost Code${validCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
