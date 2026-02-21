import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/aggregate-payments")({
  component: EntityAggregatePayments,
});

function EntityAggregatePayments() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Aggregate Payments</h1>
        <p className="mt-0.5 text-sm text-muted">Batch and aggregate payment processing for this entity</p>
      </div>
      <EmptyState title="Aggregate Payments" description="Aggregate payment tools coming soon" />
    </div>
  );
}
