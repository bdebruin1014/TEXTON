import { createFileRoute } from "@tanstack/react-router";
import { ContactDetailTabs } from "@/components/contacts/ContactDetailTabs";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/contacts")({
  component: Contacts,
});

function Contacts() {
  const { opportunityId } = Route.useParams();

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-foreground">Contacts</h2>
        <p className="mt-0.5 text-sm text-muted">People and companies linked to this opportunity</p>
      </div>
      <ContactDetailTabs recordType="opportunity" recordId={opportunityId} />
    </div>
  );
}
