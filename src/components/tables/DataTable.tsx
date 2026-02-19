import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
}

const VIRTUAL_ROW_HEIGHT = 44;
const VIRTUAL_THRESHOLD = 50;

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  toolbar,
  onRowClick,
  pageSize = 20,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const useVirtual = data.length > VIRTUAL_THRESHOLD;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(useVirtual ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: useVirtual ? undefined : { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => VIRTUAL_ROW_HEIGHT,
    overscan: 10,
    enabled: useVirtual,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const lastItem = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1] : undefined;
  const paddingBottom = lastItem ? virtualizer.getTotalSize() - lastItem.end : 0;

  return (
    <div className="space-y-3">
      {(searchKey || toolbar) && (
        <DataTableToolbar table={table} searchKey={searchKey} searchPlaceholder={searchPlaceholder}>
          {toolbar}
        </DataTableToolbar>
      )}

      <div className="rounded-lg border border-border bg-card">
        {useVirtual ? (
          <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: paddingTop }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors",
                        onRowClick && "cursor-pointer hover:bg-primary-50",
                      )}
                      style={{ height: VIRTUAL_ROW_HEIGHT }}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: paddingBottom }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted">
                    No results.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-primary-50",
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {!useVirtual && table.getPageCount() > 1 && <DataTablePagination table={table} />}
    </div>
  );
}
