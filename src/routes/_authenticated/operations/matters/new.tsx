import { createFileRoute } from "@tanstack/react-router";
import { AIIntakePage } from "@/components/intake/AIIntakePage";
import { MATTERS_INTAKE_CONFIG } from "@/lib/intake-configs";

export const Route = createFileRoute("/_authenticated/operations/matters/new")({
  component: NewMatterPage,
});

function NewMatterPage() {
  return <AIIntakePage config={MATTERS_INTAKE_CONFIG} />;
}
