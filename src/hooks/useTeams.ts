import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";
import type { RecordTeam, Team, TeamMember } from "@/types/teams";

// ── Teams ──────────────────────────────────────────────────────

export function useTeams() {
  const entityId = useEntityStore((s) => s.activeEntityId);
  return useQuery<Team[]>({
    queryKey: ["teams", entityId],
    queryFn: async () => {
      let q = supabase.from("teams").select("*").order("name");
      if (entityId) q = q.or(`entity_id.eq.${entityId},entity_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeam(teamId: string) {
  return useQuery<Team>({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useTeamMutation() {
  const queryClient = useQueryClient();
  const entityId = useEntityStore((s) => s.activeEntityId);

  const create = useMutation({
    mutationFn: async (values: { name: string; team_type?: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ ...values, entity_id: entityId, status: "Active" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
    onError: () => toast.error("Failed to create team"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Team>) => {
      const { error } = await supabase.from("teams").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", vars.id] });
    },
    onError: () => toast.error("Failed to update team"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
    onError: () => toast.error("Failed to delete team"),
  });

  return { create, update, remove };
}

// ── Team Members ───────────────────────────────────────────────

export function useTeamMembers(teamId: string) {
  return useQuery<TeamMember[]>({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, user:user_profiles(id, full_name, email, avatar_url, role)")
        .eq("team_id", teamId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!teamId,
  });
}

export function useTeamMemberMutation(teamId: string) {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: async ({ userId, role = "member" }: { userId: string; role?: string }) => {
      const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase.from("team_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members", teamId] }),
  });

  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  return { add, updateRole, remove };
}

// ── Record Teams (Assignments) ─────────────────────────────────

export function useRecordTeams(recordType: string, recordId: string) {
  return useQuery<RecordTeam[]>({
    queryKey: ["record-teams", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("record_teams")
        .select("*, team:teams(id, name, color, member_count), user:user_profiles(id, full_name, email, avatar_url)")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!recordType && !!recordId,
  });
}

export function useRecordTeamMutation(recordType: string, recordId: string) {
  const queryClient = useQueryClient();

  const assignTeam = useMutation({
    mutationFn: async ({ teamId, assignmentRole = "responsible" }: { teamId: string; assignmentRole?: string }) => {
      const { error } = await supabase.from("record_teams").insert({
        team_id: teamId,
        record_type: recordType,
        record_id: recordId,
        assignment_role: assignmentRole,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-teams", recordType, recordId] }),
  });

  const assignUser = useMutation({
    mutationFn: async ({ userId, assignmentRole = "responsible" }: { userId: string; assignmentRole?: string }) => {
      const { error } = await supabase.from("record_teams").insert({
        user_id: userId,
        record_type: recordType,
        record_id: recordId,
        assignment_role: assignmentRole,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-teams", recordType, recordId] }),
  });

  const updateRole = useMutation({
    mutationFn: async ({ assignmentId, role }: { assignmentId: string; role: string }) => {
      const { error } = await supabase.from("record_teams").update({ assignment_role: role }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-teams", recordType, recordId] }),
  });

  const remove = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("record_teams").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-teams", recordType, recordId] }),
  });

  return { assignTeam, assignUser, updateRole, remove };
}
