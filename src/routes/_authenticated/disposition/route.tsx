import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/disposition")({
  component: DispositionLayout,
});

function DispositionLayout() {
  return <Outlet />;
}
