import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/invoices")({
  component: EntityInvoices,
});

function EntityInvoices() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-0.5 text-sm text-muted">Invoice management for this entity</p>
      </div>
      <EmptyState title="Invoices" description="Invoice management coming soon" />
    </div>
  );
}
