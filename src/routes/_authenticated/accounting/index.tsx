import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

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
  reconciled_at: string | null;
}

interface EntityCard {
  id: string;
  name: string;
  entity_type: string | null;
  status: string;
  cashBalance: number;
  apOutstanding: number;
  arOutstanding: number;
  reconciledCount: number;
  lastReconciledDate: string | null;
}

function AccountingIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);

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
    queryKey: ["reconciliations_summary_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reconciliations").select("entity_id, status, reconciled_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const entityCards: EntityCard[] = useMemo(() => {
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

      const entityRecs = reconciliations.filter((r) => r.entity_id === entity.id);
      const reconciledCount = entityRecs.filter((r) => r.status === "Reconciled").length;
      const lastReconciled = entityRecs
        .filter((r) => r.status === "Reconciled" && r.reconciled_at)
        .sort((a, b) => (b.reconciled_at ?? "").localeCompare(a.reconciled_at ?? ""))
        .at(0);

      return {
        id: entity.id,
        name: entity.name,
        entity_type: entity.entity_type,
        status: entity.status,
        cashBalance,
        apOutstanding,
        arOutstanding,
        reconciledCount,
        lastReconciledDate: lastReconciled?.reconciled_at ?? null,
      };
    });
  }, [entities, bankAccounts, bills, receivables, reconciliations]);

  const totalCash = entityCards.reduce((sum, e) => sum + e.cashBalance, 0);
  const totalAP = entityCards.reduce((sum, e) => sum + e.apOutstanding, 0);
  const totalAR = entityCards.reduce((sum, e) => sum + e.arOutstanding, 0);
  const activeEntities = entities.filter((e) => e.status === "Active").length;

  const createEntity = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data, error } = await supabase
        .from("entities")
        .insert({
          name: values.name,
          entity_type: values.entity_type || null,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Entity created");
      setShowModal(false);
      if (data?.id) {
        navigate({ to: `/accounting/${data.id}/register` as string });
      }
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to create entity"),
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounting</h1>
          <p className="mt-0.5 text-sm text-muted">Financial overview across {activeEntities} active entities</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/accounting/journal-entries" as string })}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            + New Journal Entry
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Entity
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          className="rounded-lg border border-border bg-card px-4 py-3"
          style={{ borderLeft: "4px solid var(--color-nav-active)" }}
        >
          <span className="text-lg font-medium text-foreground">{formatCurrency(totalCash)}</span>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Cash Balance
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3" style={{ borderLeft: "4px solid #B84040" }}>
          <span className="text-lg font-medium text-foreground">{formatCurrency(totalAP)}</span>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            AP Outstanding
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3" style={{ borderLeft: "4px solid #3B6FA0" }}>
          <span className="text-lg font-medium text-foreground">{formatCurrency(totalAR)}</span>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            AR Outstanding
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3" style={{ borderLeft: "4px solid #C4841D" }}>
          <span className="text-lg font-medium text-foreground">{activeEntities}</span>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Active Entities
          </p>
        </div>
      </div>

      {/* Entity Cards */}
      {entitiesLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entityCards.map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={() => navigate({ to: `/accounting/${entity.id}/register` as string })}
              className="rounded-lg border border-border bg-card p-5 text-left transition-shadow"
            >
              {/* Entity header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {entity.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{entity.name}</h3>
                    <p className="text-[11px] text-muted">{entity.entity_type ?? "Entity"}</p>
                  </div>
                </div>
                <StatusBadge status={entity.status} />
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(entity.cashBalance)}</span>
                  <p className="text-[10px] text-muted">Cash Balance</p>
                </div>
                <div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: entity.apOutstanding > 0 ? "var(--color-destructive)" : "var(--color-foreground)" }}
                  >
                    {formatCurrency(entity.apOutstanding)}
                  </span>
                  <p className="text-[10px] text-muted">AP Outstanding</p>
                </div>
                <div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: entity.arOutstanding > 0 ? "var(--color-info)" : "var(--color-foreground)" }}
                  >
                    {formatCurrency(entity.arOutstanding)}
                  </span>
                  <p className="text-[10px] text-muted">AR Outstanding</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">{entity.reconciledCount}</span>
                  <p className="text-[10px] text-muted">Reconciled</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Entity"
        fields={[
          { name: "name", label: "Entity name", type: "text", required: true, placeholder: "Entity name" },
          {
            name: "entity_type",
            label: "Entity type",
            type: "select",
            placeholder: "Entity type",
            options: ["LLC", "LP", "Corporation", "Trust", "S-Corp", "Partnership"],
          },
        ]}
        onSubmit={async (values) => {
          await createEntity.mutateAsync(values);
        }}
        loading={createEntity.isPending}
      />
    </div>
  );
}
