import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  return (
    <button
      type="button"
      className={cn("flex items-center gap-1 hover:text-foreground transition-colors", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <span className="text-[10px] opacity-60">
        {column.getIsSorted() === "asc" ? "\u2191" : column.getIsSorted() === "desc" ? "\u2193" : "\u2195"}
      </span>
    </button>
  );
}
