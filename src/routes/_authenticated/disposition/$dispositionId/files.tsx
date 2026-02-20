import { createFileRoute } from "@tanstack/react-router";
import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/files")({
  component: Files,
});

function Files() {
  const { dispositionId } = Route.useParams();
  return <DocumentBrowser recordType="disposition" recordId={dispositionId} />;
}
