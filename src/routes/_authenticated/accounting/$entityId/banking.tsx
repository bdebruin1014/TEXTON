import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/banking")({
  component: () => <Navigate to="/accounting/banking" />,
});
