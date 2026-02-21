import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/reports")({
  component: EntityReports,
});

function EntityReports() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="mt-0.5 text-sm text-muted">Financial reports and statements for this entity</p>
      </div>
      <EmptyState title="Reports" description="Entity-scoped financial reports coming soon" />
    </div>
  );
}
