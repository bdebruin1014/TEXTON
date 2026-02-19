import { createFileRoute } from "@tanstack/react-router";
import { Cloud, CreditCard, FileSignature } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: Integrations,
});

const INTEGRATIONS = [
  {
    id: "microsoft365",
    name: "Microsoft 365",
    description: "Calendar sync, email logging, SharePoint document folders",
    icon: Cloud,
    status: "Not Connected" as const,
    features: ["Outlook Calendar Sync", "Email Logging", "SharePoint Folders", "Teams Notifications"],
  },
  {
    id: "docuseal",
    name: "DocuSeal",
    description: "Electronic signatures for POs, subcontracts, and sales contracts",
    icon: FileSignature,
    status: "Not Connected" as const,
    features: ["E-Sign POs", "E-Sign Subcontracts", "E-Sign Sales Contracts", "Template Library"],
  },
  {
    id: "bank-feeds",
    name: "Bank Feeds (Plaid)",
    description: "Automatic bank transaction import and categorization",
    icon: CreditCard,
    status: "Not Connected" as const,
    features: ["Auto-Import Transactions", "Categorization Rules", "Multi-Bank Support", "Reconciliation Matching"],
  },
] as const;

function Integrations() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="mt-0.5 text-sm text-muted">Connect external services to Tekton</p>
      </div>

      <div className="space-y-4">
        {INTEGRATIONS.map((integration) => (
          <div key={integration.id} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <integration.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                  <p className="mt-0.5 text-xs text-muted">{integration.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {integration.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                  {integration.status}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
