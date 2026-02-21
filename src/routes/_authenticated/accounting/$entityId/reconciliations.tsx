import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/reconciliations")({
  component: EntityReconciliations,
});

function EntityReconciliations() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Reconciliation</h1>
        <p className="mt-0.5 text-sm text-muted">Reconcile bank statements for this entity</p>
      </div>
      <EmptyState title="Reconciliation" description="Bank reconciliation tools coming soon" />
    </div>
  );
}
