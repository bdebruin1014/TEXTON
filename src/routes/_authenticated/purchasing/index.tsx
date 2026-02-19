import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/purchasing/")({
  component: () => <Navigate to="/purchasing/estimates" replace />,
});
