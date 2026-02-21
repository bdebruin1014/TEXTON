import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/operations/")({
  component: OperationsOverview,
});

const CARDS = [
  { label: "Deal Sheets", description: "Analyze lot-level deal economics", path: "/operations/deal-sheets" },
  { label: "E-Sign Documents", description: "Send and track DocuSeal documents", path: "/operations/esign" },
  { label: "RCH Contracts", description: "Manage RCH builder contracts", path: "/operations/rch-contracts" },
  { label: "Matters", description: "Track legal, compliance, and operational matters", path: "/operations/matters" },
] as const;

function OperationsOverview() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Operations</h1>
        <p className="mt-0.5 text-sm text-muted">Deal sheets, e-signatures, and contract management</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{card.label}</h3>
            <p className="mt-0.5 text-xs text-muted">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
