import { createFileRoute, Link } from "@tanstack/react-router";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/")({
  component: ReportsIndex,
});

interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string | null;
}

const REPORTS: ReportType[] = [
  {
    id: "trial-balance",
    name: "Trial Balance",
    description: "Account balances at a point in time",
    category: "Financial",
    path: "/accounting/reports/trial-balance",
  },
  {
    id: "income-statement",
    name: "Profit & Loss",
    description: "Revenue and expenses for a period",
    category: "Financial",
    path: "/accounting/reports/income-statement",
  },
  {
    id: "balance-sheet",
    name: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    category: "Financial",
    path: "/accounting/reports/balance-sheet",
  },
  {
    id: "cash-flow",
    name: "Cash Flow Statement",
    description: "Cash inflows and outflows by category",
    category: "Financial",
    path: "/accounting/reports/cash-flow",
  },
  {
    id: "aging",
    name: "AP/AR Aging",
    description: "Accounts payable and receivable aging by 30/60/90+ days",
    category: "Aging",
    path: "/accounting/reports/aging",
  },
  {
    id: "general-ledger",
    name: "General Ledger",
    description: "Complete transaction detail by account",
    category: "Detail",
    path: null,
  },
  {
    id: "job-profitability",
    name: "Job Profitability",
    description: "Revenue vs cost by job for margin analysis",
    category: "Detail",
    path: null,
  },
];

const CATEGORIES = ["Financial", "Aging", "Detail"] as const;

function ReportsIndex() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="mt-0.5 text-sm text-muted">
          {activeEntityId ? "Entity-scoped reports" : "All-entity reports"} · {REPORTS.length} available
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const categoryReports = REPORTS.filter((r) => r.category === category);
        return (
          <div key={category} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{category} Reports</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <h3 className="text-sm font-semibold text-foreground">{report.name}</h3>
                  <p className="mt-1 text-xs text-muted">{report.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    {report.path ? (
                      <Link
                        to={report.path}
                        className="flex items-center gap-1.5 rounded bg-button px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-button-hover"
                      >
                        View Report
                      </Link>
                    ) : (
                      <span className="rounded bg-card-hover px-3 py-1.5 text-xs font-medium text-muted">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
