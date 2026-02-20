import { createFileRoute } from "@tanstack/react-router";
import { UploadRequestsTable } from "@/components/documents/sharing/UploadRequestsTable";

export const Route = createFileRoute("/_authenticated/projects/$projectId/upload-requests")({
  component: UploadRequests,
});

function UploadRequests() {
  const { projectId } = Route.useParams();
  return <UploadRequestsTable recordType="project" recordId={projectId} />;
}
