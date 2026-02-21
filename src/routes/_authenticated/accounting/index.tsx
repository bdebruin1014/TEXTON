import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { ModuleIndex, type ModuleKpi } from "@/components/layout/ModuleIndex";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/accounting/")({
  component: AccountingIndex,
});

interface Entity {
  id: string;
  name: string;
  entity_type: string | null;
  status: string;
}

interface BankAccount {
  entity_id: string | null;
  current_balance: number | null;
  status: string;
}

interface Bill {
  entity_id: string | null;
  amount: number | null;
  status: string;
}

interface Receivable {
  entity_id: string | null;
  amount: number | null;
  received_amount: number | null;
  status: string;
}

interface Reconciliation {
  entity_id: string | null;
  status: string;
}

interface EntityRow {
  id: string;
  name: string;
  entity_type: string | null;
  status: string;
  cashBalance: number;
  apOutstanding: number;
  arOutstanding: number;
  reconciledCount: number;
}

const columns: ColumnDef<EntityRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Entity" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "entity_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("entity_type") ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "cashBalance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cash Balance" />,
    cell: ({ row }) => formatCurrency(row.getValue("cashBalance") as number),
  },
  {
    accessorKey: "apOutstanding",
    header: ({ column }) => <DataTableColumnHeader column={column} title="AP Outstanding" />,
    cell: ({ row }) => {
      const val = row.getValue("apOutstanding") as number;
      return val > 0 ? <span className="text-destructive">{formatCurrency(val)}</span> : formatCurrency(0);
    },
  },
  {
    accessorKey: "arOutstanding",
    header: ({ column }) => <DataTableColumnHeader column={column} title="AR Outstanding" />,
    cell: ({ row }) => {
      const val = row.getValue("arOutstanding") as number;
      return val > 0 ? <span className="text-info">{formatCurrency(val)}</span> : formatCurrency(0);
    },
  },
  {
    accessorKey: "reconciledCount",
    header: "Reconciled",
    cell: ({ row }) => {
      const count = row.getValue("reconciledCount") as number;
      return <span className="text-muted">{count}</span>;
    },
  },
];

function AccountingIndex() {
  const navigate = useNavigate();

  const { data: entities = [], isLoading: entitiesLoading } = useQuery<Entity[]>({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name, entity_type, status").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["bank_accounts_summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("entity_id, current_balance, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["bills_summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("entity_id, amount, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: receivables = [] } = useQuery<Receivable[]>({
    queryKey: ["receivables_summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receivables").select("entity_id, amount, received_amount, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reconciliations = [] } = useQuery<Reconciliation[]>({
    queryKey: ["reconciliations_summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reconciliations").select("entity_id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const entityRows: EntityRow[] = useMemo(() => {
    return entities.map((entity) => {
      const cashBalance = bankAccounts
        .filter((b) => b.entity_id === entity.id && b.status === "Active")
        .reduce((sum, b) => sum + (b.current_balance ?? 0), 0);

      const apOutstanding = bills
        .filter(
          (b) =>
            b.entity_id === entity.id && (b.status === "Open" || b.status === "Approved" || b.status === "Partial"),
        )
        .reduce((sum, b) => sum + (b.amount ?? 0), 0);

      const arOutstanding = receivables
        .filter(
          (r) => r.entity_id === entity.id && (r.status === "Open" || r.status === "Partial" || r.status === "Overdue"),
        )
        .reduce((sum, r) => sum + ((r.amount ?? 0) - (r.received_amount ?? 0)), 0);

      const reconciledCount = reconciliations.filter(
        (r) => r.entity_id === entity.id && r.status === "Reconciled",
      ).length;

      return {
        id: entity.id,
        name: entity.name,
        entity_type: entity.entity_type,
        status: entity.status,
        cashBalance,
        apOutstanding,
        arOutstanding,
        reconciledCount,
      };
    });
  }, [entities, bankAccounts, bills, receivables, reconciliations]);

  const totalCash = entityRows.reduce((sum, e) => sum + e.cashBalance, 0);
  const totalAP = entityRows.reduce((sum, e) => sum + e.apOutstanding, 0);
  const totalAR = entityRows.reduce((sum, e) => sum + e.arOutstanding, 0);
  const totalReconciled = entityRows.reduce((sum, e) => sum + e.reconciledCount, 0);
  const activeEntities = entities.filter((e) => e.status === "Active").length;

  const kpis: ModuleKpi[] = [
    { label: "Cash Balance", value: formatCurrency(totalCash), accentColor: "#48BB78" },
    {
      label: "AP Outstanding",
      value: formatCurrency(totalAP),
      sub: `${bills.filter((b) => b.status === "Open" || b.status === "Approved" || b.status === "Partial").length} open bills`,
      accentColor: "#B84040",
    },
    {
      label: "AR Outstanding",
      value: formatCurrency(totalAR),
      sub: `${receivables.filter((r) => r.status === "Open" || r.status === "Partial" || r.status === "Overdue").length} open receivables`,
      accentColor: "#3B6FA0",
    },
    {
      label: "Reconciled Accounts",
      value: totalReconciled,
      sub: `${activeEntities} active entities`,
      accentColor: "#C4841D",
    },
  ];

  return (
    <ModuleIndex title="Accounting" subtitle="Financial overview across all entities" kpis={kpis}>
      {entitiesLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable
          columns={columns}
          data={entityRows}
          searchKey="name"
          searchPlaceholder="Search entities..."
          onRowClick={(row) => navigate({ to: "/accounting/register", search: { entity: row.id } as never })}
        />
      )}
    </ModuleIndex>
  );
}
