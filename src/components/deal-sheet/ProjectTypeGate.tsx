import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const PROJECT_TYPES = [
  {
    key: "Scattered Lot",
    label: "Scattered Lot",
    description: "Single lot acquisitions with individual home builds",
    icon: "\u{1F3E0}",
    enabled: true,
  },
  {
    key: "Community Development",
    label: "Community Dev",
    description: "Multi-lot subdivisions with horizontal and vertical construction",
    icon: "\u{1F3D8}\uFE0F",
    enabled: true,
  },
  {
    key: "Lot Development",
    label: "Lot Development",
    description: "Raw land entitlement and horizontal development for lot sales",
    icon: "\u{1F9F1}",
    enabled: true,
  },
  {
    key: "Lot Purchase",
    label: "Lot Purchase",
    description: "Finished lot acquisitions for inventory or resale",
    icon: "\u{1F4CD}",
    enabled: true,
  },
] as const;

interface ProjectTypeGateProps {
  opportunityId: string;
}

export function ProjectTypeGate({ opportunityId }: ProjectTypeGateProps) {
  const queryClient = useQueryClient();

  const setType = useMutation({
    mutationFn: async (projectType: string) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ project_type: projectType })
        .eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
    },
  });

  return (
    <div className="py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-semibold text-foreground">Select Project Type</h2>
        <p className="mt-2 text-sm text-muted">
          Choose the development type to configure the appropriate deal analyzer.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {PROJECT_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            disabled={!type.enabled || setType.isPending}
            onClick={() => setType.mutate(type.key)}
            className={
              type.enabled
                ? "group rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary"
                : "rounded-lg border-2 border-border/50 bg-card/50 p-6 text-left opacity-60"
            }
          >
            <div className="mb-3 text-2xl">{type.icon}</div>
            <h3 className="text-sm font-semibold text-foreground">{type.label}</h3>
            <p className="mt-1 text-xs text-muted">{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
