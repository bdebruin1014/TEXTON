import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/banking")({
  component: EntityBanking,
});

function EntityBanking() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Bank Accounts</h1>
        <p className="mt-0.5 text-sm text-muted">Manage bank accounts and balances for this entity</p>
      </div>
      <EmptyState title="Bank Accounts" description="Bank account management coming soon" />
    </div>
  );
}
