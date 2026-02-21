import { createFileRoute } from "@tanstack/react-router";
import { AIIntakePage } from "@/components/intake/AIIntakePage";
import { CONSTRUCTION_INTAKE_CONFIG } from "@/lib/intake-configs";

export const Route = createFileRoute("/_authenticated/construction/new")({
  component: NewJobPage,
});

function NewJobPage() {
  return <AIIntakePage config={CONSTRUCTION_INTAKE_CONFIG} />;
}
