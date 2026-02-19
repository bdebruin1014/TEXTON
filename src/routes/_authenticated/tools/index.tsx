import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Calculator, FileSearch, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tools/")({
  component: ToolsPlaceholder,
});

const TOOLS = [
  {
    name: "Market Analysis",
    description: "Comparable sales analysis, market trends, and pricing intelligence",
    icon: BarChart3,
  },
  {
    name: "Cost Estimator",
    description: "AI-powered construction cost estimation by location and specification",
    icon: Calculator,
  },
  {
    name: "Document Search",
    description: "Full-text search across all project documents and contracts",
    icon: FileSearch,
  },
  {
    name: "Bulk Communications",
    description: "Send templated emails and notices to contacts, buyers, and investors",
    icon: Mail,
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
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gray-100 p-2.5">
                <tool.icon className="h-5 w-5 text-muted" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
                <p className="mt-1 text-xs text-muted">{tool.description}</p>
                <span className="mt-3 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted">
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
