import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tools/")({
  component: ToolsIndex,
});

const ACTIVE_TOOLS = [
  {
    name: "Deal Analyzer",
    description: "Quick scattered lot underwriting. Select a floor plan, enter costs, get an instant go/no-go.",
    path: "/tools/deal-analyzer",
  },
  {
    name: "Community Development Proforma",
    description: "Two-phase proforma for land assembly through home sales with LP waterfall.",
    path: "/tools/community-proforma",
  },
  {
    name: "Lot Development Proforma",
    description: "Horizontal-only proforma for developing and selling finished lots.",
    path: "/tools/lot-dev-proforma",
  },
  {
    name: "Lot Purchase Proforma",
    description: "Takedown schedule proforma for buying finished lots and building homes.",
    path: "/tools/lot-purchase-proforma",
  },
];

const COMING_SOON = [
  { name: "Market Analysis", description: "Comparable sales research and market trend analysis." },
  { name: "Cost Estimator", description: "Quick construction cost estimates by plan type and location." },
  { name: "Document Search", description: "AI-powered search across project documents and contracts." },
  { name: "Bulk Communications", description: "Template-based email and notification campaigns." },
];

function ToolsIndex() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Proforma Tools</h1>
        <p className="mt-0.5 text-sm text-muted">
          Standalone analysis tools for Red Cedar Homes deal underwriting and proforma modeling
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIVE_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.path}
            onClick={(e) => {
              e.preventDefault();
              navigate({ to: tool.path as string });
            }}
            className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-sm"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{tool.name}</h3>
            <p className="mt-1 text-xs text-muted">{tool.description}</p>
          </a>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-sm font-semibold text-muted">Coming Soon</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COMING_SOON.map((tool) => (
          <div key={tool.name} className="rounded-lg border border-dashed border-border bg-card p-6 opacity-50">
            <h3 className="text-sm font-semibold text-muted">{tool.name}</h3>
            <p className="mt-1 text-xs text-muted">{tool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
