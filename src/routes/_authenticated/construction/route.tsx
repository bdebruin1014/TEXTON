import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/construction")({
  component: ConstructionLayout,
});

function ConstructionLayout() {
  return <Outlet />;
}
