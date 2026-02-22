import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/aggregate-payments")({
  component: () => <Navigate to="/accounting/aggregate-payments" />,
});
