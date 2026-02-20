import { createFileRoute } from "@tanstack/react-router";
import { UploadRequestsTable } from "@/components/documents/sharing/UploadRequestsTable";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/upload-requests")({
  component: UploadRequests,
});

function UploadRequests() {
  const { dispositionId } = Route.useParams();
  return <UploadRequestsTable recordType="disposition" recordId={dispositionId} />;
}
