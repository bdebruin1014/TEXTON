import type { Table } from "@tanstack/react-table";
import { Search } from "lucide-react";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder,
  children,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between gap-3">
      {searchKey && (
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder={searchPlaceholder ?? "Search..."}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
