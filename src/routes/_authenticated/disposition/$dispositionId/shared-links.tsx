import { createFileRoute } from "@tanstack/react-router";
import { SharedLinksTable } from "@/components/documents/sharing/SharedLinksTable";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/shared-links")({
  component: SharedLinks,
});

function SharedLinks() {
  const { dispositionId } = Route.useParams();
  return <SharedLinksTable recordType="disposition" recordId={dispositionId} />;
}
