import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/")({
  component: () => {
    const { dispositionId } = Route.useParams();
    return <Navigate to={`/disposition/${dispositionId}/overview` as string} replace />;
  },
});
