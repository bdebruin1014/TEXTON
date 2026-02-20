import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  component: AuditLog,
});

interface AuditEntry {
  id: string;
  timestamp: string;
  user_name: string | null;
  action: string;
  resource_type: string | null;
  resource_name: string | null;
  details: string | null;
  ip_address: string | null;
}

const ACTION_FILTERS = ["All", "Create", "Update", "Delete", "Login", "Export"] as const;

function AuditLog() {
  const [actionFilter, setActionFilter] = useState<string>("All");

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit-log", actionFilter],
    queryFn: async () => {
      let query = supabase.from("audit_log").select("*").order("timestamp", { ascending: false }).limit(500);
      if (actionFilter !== "All") {
        query = query.eq("action", actionFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    {
      accessorKey: "timestamp",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
      cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDate(row.getValue("timestamp"))}</span>,
    },
    {
      accessorKey: "user_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("user_name") ?? "System"}</span>,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        const colors: Record<string, string> = {
          Create: "bg-success-bg text-success-text",
          Update: "bg-info-bg text-info-text",
          Delete: "bg-destructive-bg text-destructive-text",
          Login: "bg-accent text-foreground",
          Export: "bg-warning-bg text-warning-text",
        };
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[action] ?? "bg-accent text-muted-foreground"}`}
          >
            {action}
          </span>
        );
      },
    },
    {
      accessorKey: "resource_type",
      header: "Resource",
      cell: ({ row }) => {
        const type = row.getValue("resource_type") as string | null;
        const name = row.original.resource_name;
        return (
          <span className="text-sm">
            {type && <span className="font-medium">{type}</span>}
            {name && <span className="text-muted"> · {name}</span>}
            {!type && !name && "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => (
        <span className="max-w-[250px] truncate text-xs text-muted">{row.getValue("details") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP",
      cell: ({ row }) => <span className="font-mono text-[10px] text-muted">{row.getValue("ip_address") ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Audit Log</h1>
          <p className="mt-0.5 text-sm text-muted">{entries.length} entries (last 500)</p>
        </div>
        {/* Action filter pills */}
        <div className="flex gap-1">
          {ACTION_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActionFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                actionFilter === filter ? "bg-primary text-white" : "bg-accent text-muted hover:bg-border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries" description="System activity will appear here" />
      ) : (
        <DataTable columns={columns} data={entries} searchKey="user_name" searchPlaceholder="Search audit log..." />
      )}
    </div>
  );
}
