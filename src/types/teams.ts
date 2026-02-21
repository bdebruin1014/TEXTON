export interface Team {
  id: string;
  name: string;
  description: string | null;
  status: "Active" | "Inactive";
  entity_id: string | null;
  team_type: "department" | "project" | "ad_hoc";
  color: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "lead" | "member" | "viewer";
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

export interface RecordTeam {
  id: string;
  team_id: string | null;
  user_id: string | null;
  record_type: "opportunity" | "project" | "job" | "disposition" | "matter" | "rch_contract";
  record_id: string;
  assignment_role: "responsible" | "accountable" | "consulted" | "informed";
  created_at: string;
  updated_at: string;
  // Joined fields
  team?: Pick<Team, "id" | "name" | "color" | "member_count">;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export type AssignableRecordType = RecordTeam["record_type"];
export type TeamMemberRole = TeamMember["role"];
export type AssignmentRole = RecordTeam["assignment_role"];
export type TeamType = Team["team_type"];
