import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports")({
  component: Reports,
});

interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
}

const REPORTS: ReportType[] = [
  {
    id: "trial-balance",
    name: "Trial Balance",
    description: "Account balances at a point in time",
    category: "Financial",
  },
  {
    id: "income-statement",
    name: "Profit & Loss",
    description: "Revenue and expenses for a period",
    category: "Financial",
  },
  {
    id: "balance-sheet",
    name: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    category: "Financial",
  },
  {
    id: "cash-flow",
    name: "Cash Flow Statement",
    description: "Cash inflows and outflows by category",
    category: "Financial",
  },
  { id: "aged-ar", name: "Aged AR", description: "Accounts receivable aging by 30/60/90+ days", category: "Aging" },
  { id: "aged-ap", name: "Aged AP", description: "Accounts payable aging by 30/60/90+ days", category: "Aging" },
  {
    id: "general-ledger",
    name: "General Ledger",
    description: "Complete transaction detail by account",
    category: "Detail",
  },
  {
    id: "job-profitability",
    name: "Job Profitability",
    description: "Revenue vs cost by job for margin analysis",
    category: "Detail",
  },
];

const CATEGORIES = ["Financial", "Aging", "Detail"] as const;

function Reports() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = (reportId: string) => {
    setGenerating(reportId);
    // Placeholder: in production, fetch data and render report
    setTimeout(() => setGenerating(null), 1500);
  };

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
                    <button
                      type="button"
                      onClick={() => generateReport(report.id)}
                      disabled={generating === report.id}
                      className="flex items-center gap-1.5 rounded bg-button px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-button-hover disabled:opacity-50"
                    >
                      {generating === report.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : null}
                      Generate
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
                    >
                      Excel
                    </button>
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
