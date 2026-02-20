import { createFileRoute } from "@tanstack/react-router";
import { UploadRequestsTable } from "@/components/documents/sharing/UploadRequestsTable";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/upload-requests")({
  component: UploadRequests,
});

function UploadRequests() {
  const { opportunityId } = Route.useParams();
  return <UploadRequestsTable recordType="opportunity" recordId={opportunityId} />;
}
