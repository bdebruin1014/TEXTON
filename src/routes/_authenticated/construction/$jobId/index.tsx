import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/construction/$jobId/")({
  component: () => {
    const { jobId } = Route.useParams();
    return <Navigate to="/construction/$jobId/job-info" params={{ jobId }} />;
  },
});
