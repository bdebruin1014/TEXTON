import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/")({
  component: () => <Navigate to="/accounting/register" replace />,
});
