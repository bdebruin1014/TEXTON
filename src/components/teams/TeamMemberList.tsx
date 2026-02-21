import { useState } from "react";
import { useTeamMemberMutation, useTeamMembers } from "@/hooks/useTeams";
import { TEAM_MEMBER_ROLES } from "@/lib/constants";
import type { TeamMember } from "@/types/teams";
import { UserSelect } from "./UserSelect";

interface TeamMemberListProps {
  teamId: string;
}

export function TeamMemberList({ teamId }: TeamMemberListProps) {
  const { data: members = [], isLoading } = useTeamMembers(teamId);
  const { add, updateRole, remove } = useTeamMemberMutation(teamId);
  const [adding, setAdding] = useState(false);

  const existingUserIds = members.map((m) => m.user_id);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-accent" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Members ({members.length})</h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm font-medium text-primary hover:underline"
        >
          + Add Member
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted">Select a user to add:</p>
          <UserSelect
            value={null}
            excludeIds={existingUserIds}
            onChange={(userId) => {
              add.mutate({ userId });
              setAdding(false);
            }}
          />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted">No members yet. Add team members above.</p>
      ) : (
        <div className="space-y-1">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onRoleChange={(role) => updateRole.mutate({ memberId: member.id, role })}
              onRemove={() => remove.mutate(member.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  onRoleChange,
  onRemove,
}: {
  member: TeamMember;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  const user = member.user;
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{user?.full_name ?? "Unnamed"}</div>
        <div className="truncate text-xs text-muted">{user?.email}</div>
      </div>
      <select
        value={member.role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-xs"
      >
        {TEAM_MEMBER_ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>
      <button type="button" onClick={onRemove} className="text-muted hover:text-destructive" title="Remove member">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
