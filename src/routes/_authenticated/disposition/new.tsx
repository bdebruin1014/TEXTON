import { createFileRoute } from "@tanstack/react-router";
import { AIIntakePage } from "@/components/intake/AIIntakePage";
import { DISPOSITION_INTAKE_CONFIG } from "@/lib/intake-configs";

export const Route = createFileRoute("/_authenticated/disposition/new")({
  component: NewDispositionPage,
});

function NewDispositionPage() {
  return <AIIntakePage config={DISPOSITION_INTAKE_CONFIG} />;
}
