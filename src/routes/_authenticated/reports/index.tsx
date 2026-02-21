import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsIndex,
});

interface PresetReport {
  id: string;
  title: string;
  description: string;
  category: string;
}

const PRESET_REPORTS: PresetReport[] = [
  // General
  {
    id: "portfolio-summary",
    title: "Portfolio Summary",
    description: "High-level overview of all projects, revenue, and key metrics across the portfolio",
    category: "General",
  },
  {
    id: "entity-overview",
    title: "Entity Overview",
    description: "Financial summary per entity including cash balances, AR/AP, and active projects",
    category: "General",
  },
  {
    id: "monthly-executive",
    title: "Monthly Executive Summary",
    description: "Month-over-month performance dashboard for leadership review",
    category: "General",
  },
  {
    id: "project-status",
    title: "Project Status Report",
    description: "Current status of all projects with timeline and budget variance",
    category: "General",
  },
  {
    id: "cash-position",
    title: "Cash Position Report",
    description: "Consolidated cash balances across all bank accounts and entities",
    category: "General",
  },
  {
    id: "upcoming-closings",
    title: "Upcoming Closings",
    description: "All scheduled closings in the next 30/60/90 days with amounts",
    category: "General",
  },
  {
    id: "variance-analysis",
    title: "Variance Analysis",
    description: "Budget vs actual comparison across all active projects",
    category: "General",
  },
  {
    id: "activity-log",
    title: "Activity Log",
    description: "Recent system activity including record changes, notes, and user actions",
    category: "General",
  },

  // Pipeline
  {
    id: "pipeline-funnel",
    title: "Pipeline Funnel",
    description: "Visual funnel of opportunities from lead through closing",
    category: "Pipeline",
  },
  {
    id: "deal-comparison",
    title: "Deal Comparison",
    description: "Side-by-side analysis of active deals with key financial metrics",
    category: "Pipeline",
  },
  {
    id: "pipeline-aging",
    title: "Pipeline Aging",
    description: "Days in current stage for each opportunity with stale deal alerts",
    category: "Pipeline",
  },
  {
    id: "win-loss",
    title: "Win/Loss Analysis",
    description: "Historical win rate by deal type, market, and price range",
    category: "Pipeline",
  },

  // Construction
  {
    id: "active-jobs",
    title: "Active Jobs Summary",
    description: "All jobs in progress with current phase, budget consumed, and schedule status",
    category: "Construction",
  },
  {
    id: "schedule-variance",
    title: "Schedule Variance",
    description: "Planned vs actual construction timeline by job and phase",
    category: "Construction",
  },
  {
    id: "cost-overrun",
    title: "Cost Overrun Report",
    description: "Jobs exceeding budget thresholds with line-item breakdown",
    category: "Construction",
  },
  {
    id: "vendor-performance",
    title: "Vendor Performance",
    description: "Trade partner scorecards based on quality, timeline, and cost",
    category: "Construction",
  },

  // Accounting
  {
    id: "gl-summary",
    title: "GL Summary",
    description: "General ledger balances by account with period comparison",
    category: "Accounting",
  },
  {
    id: "ap-aging",
    title: "AP Aging Report",
    description: "Accounts payable aging buckets (30/60/90+ days) by vendor",
    category: "Accounting",
  },
  {
    id: "ar-aging",
    title: "AR Aging Report",
    description: "Accounts receivable aging buckets by customer and entity",
    category: "Accounting",
  },
  {
    id: "bank-reconciliation",
    title: "Bank Reconciliation",
    description: "Reconciliation status and outstanding items per bank account",
    category: "Accounting",
  },
  {
    id: "expense-breakdown",
    title: "Expense Breakdown",
    description: "Categorized expenses by entity, project, and vendor for any date range",
    category: "Accounting",
  },

  // Investor
  {
    id: "investor-returns",
    title: "Investor Returns",
    description: "IRR, equity multiple, and cash-on-cash by fund and investor",
    category: "Investor",
  },
  {
    id: "distribution-history",
    title: "Distribution History",
    description: "All distributions paid with waterfall tier and date detail",
    category: "Investor",
  },
  {
    id: "capital-account",
    title: "Capital Account Statements",
    description: "Per-investor capital account balance with contribution and distribution history",
    category: "Investor",
  },
  {
    id: "k1-tracker",
    title: "K-1 Tracker",
    description: "K-1 preparation status by entity and tax year",
    category: "Investor",
  },

  // Disposition
  {
    id: "sales-pipeline",
    title: "Sales Pipeline",
    description: "All active home sales with buyer, price, and closing timeline",
    category: "Disposition",
  },
  {
    id: "revenue-forecast",
    title: "Revenue Forecast",
    description: "Projected revenue from pending and scheduled closings",
    category: "Disposition",
  },
  {
    id: "buyer-activity",
    title: "Buyer Activity",
    description: "Buyer engagement metrics including showings, offers, and conversion rates",
    category: "Disposition",
  },
  {
    id: "sellout-progress",
    title: "Sellout Progress",
    description: "Community sellout status with lots sold, pending, and available",
    category: "Disposition",
  },

  // Tasks
  {
    id: "open-tasks",
    title: "Open Tasks",
    description: "All open tasks across projects grouped by assignee and priority",
    category: "Tasks",
  },
  {
    id: "overdue-tasks",
    title: "Overdue Tasks",
    description: "Tasks past their due date with days overdue and project context",
    category: "Tasks",
  },
  {
    id: "task-completion",
    title: "Task Completion Rate",
    description: "Team productivity metrics including completion rate and average time to close",
    category: "Tasks",
  },
  {
    id: "upcoming-deadlines",
    title: "Upcoming Deadlines",
    description: "Tasks and milestones due in the next 7/14/30 days",
    category: "Tasks",
  },
];

function ReportsIndex() {
  const location = useRouterState({ select: (s) => s.location });
  const activeCategory = (location.search as Record<string, string>)?.category ?? "General";

  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    let result = PRESET_REPORTS.filter((r) => r.category === activeCategory);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return result;
  }, [activeCategory, searchTerm]);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{activeCategory} Reports</h1>
          <p className="mt-0.5 text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "report" : "reports"}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-56 rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted transition-colors focus:border-primary"
        />
      </div>

      {/* Card grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((report) => (
            <div
              key={report.id}
              className="cursor-pointer rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                {report.title}
              </h3>
              <p className="mt-1 text-xs text-muted">{report.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted">No reports match your search</p>
        </div>
      )}
    </div>
  );
}
