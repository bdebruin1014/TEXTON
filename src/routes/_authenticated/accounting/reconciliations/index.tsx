import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reconciliations/")({
  component: ReconciliationDashboard,
});

interface RecMonth {
  id: string;
  bank_account_name: string | null;
  month: string;
  status: string;
  statement_balance: number | null;
  book_balance: number | null;
  difference: number | null;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ReconciliationDashboard() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: reconciliations = [], isLoading } = useQuery<RecMonth[]>({
    queryKey: ["reconciliations", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("reconciliations").select("*").order("month", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const currentYear = new Date().getFullYear();
  const reconByMonth = new Map(reconciliations.map((r) => [r.month, r]));

  const statusColor = (status: string) => {
    switch (status) {
      case "Reconciled":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bank Reconciliation</h1>
          <p className="mt-0.5 text-sm text-muted">Monthly reconciliation status — {currentYear}</p>
        </div>
        <Link
          to="/accounting/reconciliations/start"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Start Reconciliation
        </Link>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : (
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-4">
          {MONTHS.map((month, index) => {
            const key = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
            const recon = reconByMonth.get(key);
            return (
              <div
                key={month}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{month}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(recon?.status ?? "Not Started")}`}
                  >
                    {recon?.status ?? "Not Started"}
                  </span>
                </div>
                {recon ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Statement</span>
                      <span>{formatCurrency(recon.statement_balance ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Book</span>
                      <span>{formatCurrency(recon.book_balance ?? 0)}</span>
                    </div>
                    {recon.difference != null && Math.abs(recon.difference) > 0.01 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Difference</span>
                        <span className="text-destructive">{formatCurrency(recon.difference)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No data</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History Link */}
      <div className="mt-6 text-center">
        <Link to="/accounting/reconciliations/history" className="text-sm font-medium text-primary hover:underline">
          View Reconciliation History
        </Link>
      </div>
    </div>
  );
}
