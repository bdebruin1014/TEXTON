import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
  component: () => {
    const { projectId } = Route.useParams();
    return <Navigate to="/projects/$projectId/basic-info" params={{ projectId }} />;
  },
});
