import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { TeamMemberList } from "@/components/teams/TeamMemberList";
import { useTeam } from "@/hooks/useTeams";
import { TEAM_TYPE_LABELS, TEAM_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/workflows/teams/$teamId")({
  component: TeamDetail,
});

const TEAM_TYPE_OPTIONS = TEAM_TYPES.map((t) => TEAM_TYPE_LABELS[t]).filter((v): v is string => !!v);

function TeamDetail() {
  const { teamId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: team, isLoading } = useTeam(teamId);

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("teams").update(updates).eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      navigate({ to: "/workflows/teams" });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    // Convert display label back to stored value for team_type
    if (field === "team_type") {
      const entry = Object.entries(TEAM_TYPE_LABELS).find(([, label]) => label === value);
      if (entry) {
        await mutation.mutateAsync({ [field]: entry[0] });
        return;
      }
    }
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) return <FormSkeleton />;
  if (!team) return <div className="py-12 text-center text-sm text-muted">Team not found</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate({ to: "/workflows/teams" })}
            className="mb-1 text-xs text-muted hover:text-foreground"
          >
            &larr; All Teams
          </button>
          <h2 className="text-lg font-semibold text-foreground">{team.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this team? This cannot be undone.")) deleteMutation.mutate();
          }}
          className="rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Delete Team
        </button>
      </div>

      {/* Team Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Team Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Team Name" value={team.name} onSave={save("name")} />
          <AutoSaveSelect
            label="Type"
            value={TEAM_TYPE_LABELS[team.team_type]}
            onSave={save("team_type")}
            options={TEAM_TYPE_OPTIONS}
            placeholder="Select type..."
          />
          <StatusSelect label="Status" value={team.status} onSave={save("status")} statuses={["Active", "Inactive"]} />
          <div className="space-y-1.5">
            <label htmlFor="team-color" className="text-sm font-medium text-foreground">
              Color
            </label>
            <input
              id="team-color"
              type="color"
              value={team.color ?? "var(--color-primary-accent)"}
              onChange={(e) => mutation.mutate({ color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>
        </div>
        <div className="mt-4">
          <AutoSaveField
            label="Description"
            value={team.description}
            onSave={save("description")}
            type="textarea"
            rows={3}
            placeholder="Describe this team's purpose..."
          />
        </div>
      </div>

      {/* Members */}
      <div className="rounded-lg border border-border bg-card p-6">
        <TeamMemberList teamId={teamId} />
      </div>
    </div>
  );
}
