import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tools/")({
  component: ToolsIndex,
});

const TOOLS = [
  {
    name: "Deal Analyzer",
    description:
      "Scattered lot underwriting — select floor plan, municipality, and financing to generate a full deal sheet",
    path: "/tools/deal-analyzer",
  },
  {
    name: "Community Proforma",
    description: "Two-phase community development proforma with horizontal + vertical economics and LP waterfall",
    path: "/tools/community-proforma",
  },
  {
    name: "Lot Development Proforma",
    description: "Horizontal-only lot development model with absorption schedule and investor returns",
    path: "/tools/lot-dev-proforma",
  },
  {
    name: "Lot Purchase Proforma",
    description: "Lot purchase agreement model with takedown schedule and per-home economics",
    path: "/tools/lot-purchase-proforma",
  },
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
        {TOOLS.map((tool) => (
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
    </div>
  );
}
