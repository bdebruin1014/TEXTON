import { useState } from "react";
import { useRecordTeamMutation, useRecordTeams } from "@/hooks/useTeams";
import { ASSIGNMENT_ROLES } from "@/lib/constants";
import type { AssignableRecordType, RecordTeam } from "@/types/teams";
import { TeamSelect } from "./TeamSelect";
import { UserSelect } from "./UserSelect";

interface RecordTeamAssignmentProps {
  recordType: AssignableRecordType;
  recordId: string;
}

export function RecordTeamAssignment({ recordType, recordId }: RecordTeamAssignmentProps) {
  const { data: assignments = [], isLoading } = useRecordTeams(recordType, recordId);
  const { assignTeam, assignUser, updateRole, remove } = useRecordTeamMutation(recordType, recordId);
  const [mode, setMode] = useState<"idle" | "team" | "user">("idle");

  const teamAssignments = assignments.filter((a) => a.team_id);
  const userAssignments = assignments.filter((a) => a.user_id && !a.team_id);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Team & Assignments</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "team" ? "idle" : "team")}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Team
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "user" ? "idle" : "user")}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Person
          </button>
        </div>
      </div>

      {mode === "team" && (
        <div className="mb-4 rounded border border-border bg-background p-3">
          <p className="mb-2 text-xs font-medium text-muted">Assign a team:</p>
          <TeamSelect
            value={null}
            onChange={(teamId) => {
              assignTeam.mutate({ teamId });
              setMode("idle");
            }}
          />
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "user" && (
        <div className="mb-4 rounded border border-border bg-background p-3">
          <p className="mb-2 text-xs font-medium text-muted">Assign a person:</p>
          <UserSelect
            value={null}
            onChange={(userId) => {
              assignUser.mutate({ userId });
              setMode("idle");
            }}
          />
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-accent" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted">No teams or people assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {teamAssignments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Teams</p>
              <div className="space-y-1">
                {teamAssignments.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} onRoleChange={updateRole.mutate} onRemove={remove.mutate} />
                ))}
              </div>
            </div>
          )}
          {userAssignments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">People</p>
              <div className="space-y-1">
                {userAssignments.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} onRoleChange={updateRole.mutate} onRemove={remove.mutate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentRow({
  assignment,
  onRoleChange,
  onRemove,
}: {
  assignment: RecordTeam;
  onRoleChange: (args: { assignmentId: string; role: string }) => void;
  onRemove: (id: string) => void;
}) {
  const isTeam = !!assignment.team_id;
  const label = isTeam ? assignment.team?.name : (assignment.user?.full_name ?? assignment.user?.email);
  const sublabel = isTeam ? `${assignment.team?.member_count ?? 0} members` : assignment.user?.email;

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
      {isTeam ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: assignment.team?.color ?? "var(--color-primary-accent)" }}
        >
          T
        </span>
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
          {assignment.user?.full_name
            ? assignment.user.full_name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{label ?? "Unknown"}</div>
        {!isTeam && sublabel && <div className="truncate text-xs text-muted">{sublabel}</div>}
      </div>
      <select
        value={assignment.assignment_role}
        onChange={(e) => onRoleChange({ assignmentId: assignment.id, role: e.target.value })}
        className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px]"
      >
        {ASSIGNMENT_ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(assignment.id)}
        className="text-muted hover:text-destructive"
        title="Remove"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
