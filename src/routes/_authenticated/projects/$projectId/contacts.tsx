import { createFileRoute } from "@tanstack/react-router";
import { ContactDetailTabs } from "@/components/contacts/ContactDetailTabs";

export const Route = createFileRoute("/_authenticated/projects/$projectId/contacts")({
  component: Contacts,
});

function Contacts() {
  const { projectId } = Route.useParams();

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-foreground">Contacts</h2>
        <p className="mt-0.5 text-sm text-muted">People and companies linked to this project</p>
      </div>
      <ContactDetailTabs recordType="project" recordId={projectId} />
    </div>
  );
}
