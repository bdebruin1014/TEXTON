import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { PROJECT_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

interface Opportunity {
  id: string;
  opportunity_name: string;
  project_type: string | null;
  entity_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  county: string | null;
  lot_price: number | null;
  contract_price: number | null;
  total_lots: number | null;
  acreage: number | null;
}

interface ConvertToProjectModalProps {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity;
  onConverted: (projectId: string) => void;
}

export function ConvertToProjectModal({
  open,
  onClose,
  opportunity,
  onConverted,
}: ConvertToProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Fetch entities for the dropdown
  const { data: entities = [] } = useQuery({
    queryKey: ["entities-convert"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setProjectName(opportunity.opportunity_name);
      setProjectType(opportunity.project_type ?? "");
      setEntityId(opportunity.entity_id ?? "");
      setError(null);
      setConverting(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, opportunity]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    setConverting(true);
    setError(null);

    try {
      // 1. Insert the new project
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          project_name: projectName.trim(),
          project_type: projectType || null,
          entity_id: entityId || null,
          status: "Pre-Development",
          opportunity_id: opportunity.id,
          address_street: opportunity.address_street,
          address_city: opportunity.address_city,
          address_state: opportunity.address_state,
          address_zip: opportunity.address_zip,
          county: opportunity.county,
          total_lots: opportunity.total_lots,
          total_acreage: opportunity.acreage,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // 2. Update the opportunity — mark as Converted and link to project
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({
          status: "Converted",
          project_id: project.id,
        })
        .eq("id", opportunity.id);

      if (updateError) throw updateError;

      // 3. Navigate to the new project
      onConverted(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert opportunity");
      setConverting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Convert to Project"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-foreground">Convert to Project</h2>
          <p className="mt-0.5 text-sm text-muted">
            Create a new project from this opportunity
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleConvert} className="px-6 pb-6">
          <div className="space-y-4 pt-2">
            {/* Project Name */}
            <div>
              <label
                htmlFor="convert-name"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                Project Name <span className="text-destructive">*</span>
              </label>
              <input
                ref={nameRef}
                id="convert-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            {/* Project Type */}
            <div>
              <label
                htmlFor="convert-type"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                Project Type
              </label>
              <select
                id="convert-type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Select type...</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity */}
            <div>
              <label
                htmlFor="convert-entity"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                Entity (SPE)
              </label>
              <select
                id="convert-entity"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Select entity...</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={converting}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              {converting ? "Converting..." : "Convert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
