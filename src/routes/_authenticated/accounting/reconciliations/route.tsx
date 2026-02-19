import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting/reconciliations")({
  component: () => <Outlet />,
});
