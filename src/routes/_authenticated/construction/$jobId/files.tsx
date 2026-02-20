import { createFileRoute } from "@tanstack/react-router";
import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

export const Route = createFileRoute("/_authenticated/construction/$jobId/files")({
  component: Files,
});

function Files() {
  const { jobId } = Route.useParams();
  return <DocumentBrowser recordType="job" recordId={jobId} />;
}
