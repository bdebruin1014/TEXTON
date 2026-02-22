import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/invoices")({
  component: () => <Navigate to="/accounting/invoices" />,
});
