import { createFileRoute } from "@tanstack/react-router";
import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

export const Route = createFileRoute("/_authenticated/projects/$projectId/files")({
  component: Files,
});

function Files() {
  const { projectId } = Route.useParams();
  return <DocumentBrowser recordType="project" recordId={projectId} />;
}
