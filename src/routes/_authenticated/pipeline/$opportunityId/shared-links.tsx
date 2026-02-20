import { createFileRoute } from "@tanstack/react-router";
import { SharedLinksTable } from "@/components/documents/sharing/SharedLinksTable";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/shared-links")({
  component: SharedLinks,
});

function SharedLinks() {
  const { opportunityId } = Route.useParams();
  return <SharedLinksTable recordType="opportunity" recordId={opportunityId} />;
}
