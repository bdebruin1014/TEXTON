import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useDocuSealConfig, useSaveDocuSealConfig, useSyncDocuSealTemplates } from "@/hooks/useDocuSeal";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: Integrations,
});

const STATIC_INTEGRATIONS = [
  {
    id: "microsoft365",
    name: "Microsoft 365",
    description: "Calendar sync, email logging, SharePoint document folders",
    features: ["Outlook Calendar Sync", "Email Logging", "SharePoint Folders", "Teams Notifications"],
  },
  {
    id: "bank-feeds",
    name: "Bank Feeds (Plaid)",
    description: "Automatic bank transaction import and categorization",
    features: ["Auto-Import Transactions", "Categorization Rules", "Multi-Bank Support", "Reconciliation Matching"],
  },
] as const;

function Integrations() {
  const { data: docuSealConfig, isLoading: loadingConfig } = useDocuSealConfig();
  const saveConfig = useSaveDocuSealConfig();
  const syncTemplates = useSyncDocuSealTemplates();
  const [showDocuSealSetup, setShowDocuSealSetup] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const isDocuSealConnected = !!docuSealConfig?.is_active;

  const handleDocuSealConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Enter your DocuSeal API key");
      return;
    }
    try {
      await saveConfig.mutateAsync({ apiKey: apiKey.trim() });
      toast.success("DocuSeal connected!");
      setShowDocuSealSetup(false);
      setApiKey("");
    } catch {
      toast.error("Failed to save DocuSeal config");
    }
  };

  const handleSyncTemplates = async () => {
    try {
      const result = await syncTemplates.mutateAsync();
      toast.success(`Synced ${result?.synced ?? 0} templates from DocuSeal`);
    } catch {
      toast.error("Failed to sync templates");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="mt-0.5 text-sm text-muted">Connect external services to TEK{"\u00B7"}TON</p>
      </div>

      <div className="space-y-4">
        {/* DocuSeal — live integration */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">DocuSeal</h3>
              <p className="mt-0.5 text-xs text-muted">
                Electronic signatures for POs, subcontracts, and sales contracts
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["E-Sign POs", "E-Sign Subcontracts", "E-Sign Sales Contracts", "Template Library"].map((f) => (
                  <span key={f} className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {loadingConfig ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted">
                  Loading...
                </span>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isDocuSealConnected ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground"
                  }`}
                >
                  {isDocuSealConnected ? "Connected" : "Not Connected"}
                </span>
              )}
              {isDocuSealConnected ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSyncTemplates}
                    disabled={syncTemplates.isPending}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {syncTemplates.isPending ? "Syncing..." : "Sync Templates"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDocuSealSetup(true)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Update Key
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDocuSealSetup(true)}
                  className="rounded-lg bg-button px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {showDocuSealSetup && (
            <div className="mt-4 rounded-lg border border-border bg-background p-4">
              <p className="mb-2 text-xs font-medium text-muted">
                Enter your DocuSeal API key (found in DocuSeal Settings &gt; API):
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 rounded border border-border bg-card px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleDocuSealConnect}
                  disabled={saveConfig.isPending}
                  className="rounded-lg bg-button px-4 py-2 text-sm font-medium text-white hover:bg-button-hover disabled:opacity-50"
                >
                  {saveConfig.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocuSealSetup(false);
                    setApiKey("");
                  }}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Static integrations */}
        {STATIC_INTEGRATIONS.map((integration) => (
          <div key={integration.id} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                <p className="mt-0.5 text-xs text-muted">{integration.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {integration.features.map((feature) => (
                    <span key={feature} className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted">
                  Not Connected
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-button px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
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
