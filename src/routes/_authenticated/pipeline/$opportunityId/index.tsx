import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/pipeline/$opportunityId/basic-info", params });
  },
});
