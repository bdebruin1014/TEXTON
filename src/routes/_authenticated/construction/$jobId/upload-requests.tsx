import { createFileRoute } from "@tanstack/react-router";
import { UploadRequestsTable } from "@/components/documents/sharing/UploadRequestsTable";

export const Route = createFileRoute("/_authenticated/construction/$jobId/upload-requests")({
  component: UploadRequests,
});

function UploadRequests() {
  const { jobId } = Route.useParams();
  return <UploadRequestsTable recordType="job" recordId={jobId} />;
}
