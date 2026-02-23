import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsIndex,
});

const REPORTS = [
  {
    section: "Financial",
    items: [
      { label: "Trial Balance", path: "/reports/trial-balance", description: "Account balances with period-to-date debits, credits, and net balance by entity." },
      { label: "AP Aging", path: "/reports/ap-aging", description: "Unpaid bills grouped by vendor with aging buckets: Current, 1-30, 31-60, 61-90, 90+ days." },
      { label: "Investor Summary", path: "/reports/investor-summary", description: "Capital contributed, distributions paid, unreturned capital, and preferred return by fund." },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Project Summary", path: "/reports/project-summary", description: "Active projects with status, lot counts, units sold, investment totals, and projected margin." },
      { label: "Job Cost", path: "/reports/job-cost", description: "Budget vs. committed vs. actual costs per job with variance and completion percentage." },
      { label: "Construction Schedule", path: "/reports/construction-schedule", description: "Active jobs with current phase, days in phase, and schedule variance color coding." },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Lot Inventory", path: "/reports/lot-inventory", description: "All lots across projects with status, assigned plan, job linkage, and disposition status." },
      { label: "Disposition Pipeline", path: "/reports/disposition-pipeline", description: "Active dispositions with buyer, contract price, expected close date, and days in status." },
    ],
  },
];

function ReportsIndex() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted">Select a report to view real-time data from your projects.</p>
      </div>

      {REPORTS.map((group) => (
        <div key={group.section} className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{group.section}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((report) => (
              <Link
                key={report.path}
                to={report.path}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary-100 hover:shadow-md"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{report.label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{report.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
