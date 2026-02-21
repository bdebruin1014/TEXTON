import { createFileRoute } from "@tanstack/react-router";
import { AIIntakePage } from "@/components/intake/AIIntakePage";
import { PIPELINE_INTAKE_CONFIG } from "@/lib/intake-configs";

export const Route = createFileRoute("/_authenticated/pipeline/new")({
  component: NewOpportunityPage,
});

function NewOpportunityPage() {
  return <AIIntakePage config={PIPELINE_INTAKE_CONFIG} />;
}
