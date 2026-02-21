import { createFileRoute } from "@tanstack/react-router";
import { AIIntakePage } from "@/components/intake/AIIntakePage";
import { PROJECTS_INTAKE_CONFIG } from "@/lib/intake-configs";

export const Route = createFileRoute("/_authenticated/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  return <AIIntakePage config={PROJECTS_INTAKE_CONFIG} />;
}
