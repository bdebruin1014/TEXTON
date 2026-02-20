import type { Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-xs text-muted">{table.getFilteredRowModel().rows.length} row(s) total</p>
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className={cn(
              "rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors",
              table.getCanPreviousPage() ? "hover:bg-primary-50 text-foreground" : "text-muted opacity-50",
            )}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className={cn(
              "rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors",
              table.getCanNextPage() ? "hover:bg-primary-50 text-foreground" : "text-muted opacity-50",
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
