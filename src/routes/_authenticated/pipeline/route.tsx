import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelineLayout,
});

function PipelineLayout() {
  return <Outlet />;
}
