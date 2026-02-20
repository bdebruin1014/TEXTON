import { createFileRoute } from "@tanstack/react-router";
import { SharedLinksTable } from "@/components/documents/sharing/SharedLinksTable";

export const Route = createFileRoute("/_authenticated/projects/$projectId/shared-links")({
  component: SharedLinks,
});

function SharedLinks() {
  const { projectId } = Route.useParams();
  return <SharedLinksTable recordType="project" recordId={projectId} />;
}
