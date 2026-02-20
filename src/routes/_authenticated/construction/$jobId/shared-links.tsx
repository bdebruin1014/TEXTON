import { createFileRoute } from "@tanstack/react-router";
import { SharedLinksTable } from "@/components/documents/sharing/SharedLinksTable";

export const Route = createFileRoute("/_authenticated/construction/$jobId/shared-links")({
  component: SharedLinks,
});

function SharedLinks() {
  const { jobId } = Route.useParams();
  return <SharedLinksTable recordType="job" recordId={jobId} />;
}
