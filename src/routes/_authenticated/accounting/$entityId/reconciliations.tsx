import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/reconciliations")({
  component: () => <Navigate to="/accounting/reconciliations" />,
});
