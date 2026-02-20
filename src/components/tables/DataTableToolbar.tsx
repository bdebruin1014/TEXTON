import type { Table } from "@tanstack/react-table";

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
          <input
            placeholder={searchPlaceholder ?? "Search..."}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
