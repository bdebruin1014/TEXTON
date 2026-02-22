import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/reports")({
  component: () => <Navigate to="/accounting/reports" />,
});
