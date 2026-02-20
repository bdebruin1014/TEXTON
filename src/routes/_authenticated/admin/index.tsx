import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const CARDS = [
  { label: "Users", description: "Manage team members and roles", path: "/admin/users" },
  { label: "Permissions", description: "Configure permission groups", path: "/admin/permissions" },
  { label: "Entities", description: "Manage SPEs and parent entities", path: "/admin/entities" },
  { label: "Bank Accounts", description: "Bank account setup per entity", path: "/admin/bank-accounts" },
  { label: "Fee Schedule", description: "Fixed per-house costs", path: "/admin/fee-schedule" },
  { label: "Floor Plans", description: "Plan catalog with specs", path: "/admin/floor-plans" },
  { label: "Cost Codes", description: "Standardized cost taxonomy", path: "/admin/cost-codes" },
  { label: "Documents", description: "Document template management", path: "/admin/documents" },
  { label: "Integrations", description: "Microsoft 365, DocuSeal, Bank Feeds", path: "/admin/integrations" },
  { label: "Audit Log", description: "System-wide audit trail", path: "/admin/audit-log" },
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function AdminOverview() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">{getGreeting()}, Bryan</h1>
        <p className="mt-0.5 text-sm text-muted">System administration and configuration</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.path}
            to={card.path as string}
            className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{card.label}</h3>
              <p className="mt-0.5 text-xs text-muted">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
