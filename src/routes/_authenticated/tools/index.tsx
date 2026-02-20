import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tools/")({
  component: ToolsPlaceholder,
});

const TOOLS = [
  {
    name: "Market Analysis",
    description: "Comparable sales analysis, market trends, and pricing intelligence",
  },
  {
    name: "Cost Estimator",
    description: "AI-powered construction cost estimation by location and specification",
  },
  {
    name: "Document Search",
    description: "Full-text search across all project documents and contracts",
  },
  {
    name: "Bulk Communications",
    description: "Send templated emails and notices to contacts, buyers, and investors",
  },
] as const;

function ToolsPlaceholder() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Tools</h1>
        <p className="mt-0.5 text-sm text-muted">Coming Soon</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="rounded-lg border border-border bg-card p-6 opacity-60">
            <div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
                <p className="mt-1 text-xs text-muted">{tool.description}</p>
                <span className="mt-3 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
