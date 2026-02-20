import { createFileRoute } from "@tanstack/react-router";
import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/documents")({
  component: Documents,
});

function Documents() {
  const { opportunityId } = Route.useParams();
  return <DocumentBrowser recordType="opportunity" recordId={opportunityId} />;
}
