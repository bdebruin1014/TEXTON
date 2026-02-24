import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface WebhookPayload {
  table_name: string;
  record_id: string;
  old_status: string;
  new_status: string;
}

interface TemplateTask {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  phase: string | null;
  assigned_role: string;
  due_days: number;
  due_reference: string;
  is_gate: boolean;
  depends_on: string | null;
  sort_order: number;
}

// ── Table-to-record-type mapping ─────────────────────────────────────────────

const TABLE_TO_RECORD_TYPE: Record<string, string> = {
  opportunities: "opportunity",
  projects: "project",
  jobs: "job",
  dispositions: "disposition",
};

// ── Role resolution patterns ─────────────────────────────────────────────────
// Maps template assigned_role codes to team name fragments for fuzzy matching.

const ROLE_TEAM_PATTERNS: Record<string, string[]> = {
  pm: ["project manag", "pm"],
  acq_mgr: ["acquisition", "acq"],
  director: ["director"],
  principal: ["principal", "executive", "owner"],
  closing_coordinator: ["closing", "title", "coordinator"],
};

// ── Resolve team-based role assignments ──────────────────────────────────────
// Looks up record_teams for the triggering record (and its parent project) to
// find user assignments that match each template role code.

async function resolveTeamAssignments(
  supabase: SupabaseClient,
  recordType: string,
  recordId: string,
  projectId: string | null,
): Promise<Record<string, string>> {
  const assignments: Record<string, string> = {};

  // Gather record_teams from both the record itself and its parent project
  const lookups = [{ type: recordType, id: recordId }];
  if (projectId && recordType !== "project") {
    lookups.push({ type: "project", id: projectId });
  }

  for (const { type, id } of lookups) {
    // Direct user assignments on the record
    const { data: userTeams } = await supabase
      .from("record_teams")
      .select("user_id, assignment_role")
      .eq("record_type", type)
      .eq("record_id", id)
      .not("user_id", "is", null);

    if (userTeams) {
      for (const rt of userTeams) {
        // Look up the auth user_id from the user_profiles PK
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("user_id, role")
          .eq("id", rt.user_id)
          .single();

        if (!profile?.user_id) continue;

        // Try to match the user_profiles.role against known role patterns
        const profileRole = (profile.role ?? "").toLowerCase();
        for (const [roleCode, patterns] of Object.entries(ROLE_TEAM_PATTERNS)) {
          if (!assignments[roleCode] && patterns.some((p) => profileRole.includes(p))) {
            assignments[roleCode] = profile.user_id;
          }
        }
      }
    }

    // Team-based assignments — resolve team lead as the assigned user
    const { data: teamAssigns } = await supabase
      .from("record_teams")
      .select("team_id")
      .eq("record_type", type)
      .eq("record_id", id)
      .not("team_id", "is", null);

    if (teamAssigns) {
      for (const rt of teamAssigns) {
        const { data: team } = await supabase.from("teams").select("id, name").eq("id", rt.team_id).single();

        if (!team) continue;
        const teamName = (team.name ?? "").toLowerCase();

        for (const [roleCode, patterns] of Object.entries(ROLE_TEAM_PATTERNS)) {
          if (assignments[roleCode]) continue; // already resolved
          if (!patterns.some((p) => teamName.includes(p))) continue;

          // Get the team lead's auth user_id
          const { data: members } = await supabase
            .from("team_members")
            .select("user_id")
            .eq("team_id", team.id)
            .eq("role", "lead")
            .limit(1);

          if (members?.[0]?.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("user_id")
              .eq("id", members[0].user_id)
              .single();

            if (profile?.user_id) {
              assignments[roleCode] = profile.user_id;
            }
          }
        }
      }
    }
  }

  return assignments;
}

// ── Determine project context ────────────────────────────────────────────────
// Returns { projectId, projectType } for the triggering record.

async function resolveProjectContext(
  supabase: SupabaseClient,
  tableName: string,
  recordId: string,
  record: Record<string, unknown>,
): Promise<{ projectId: string | null; projectType: string | null; entityId: string | null }> {
  let projectId: string | null = null;
  let projectType: string | null = null;
  const entityId: string | null = (record.entity_id as string) ?? null;

  if (tableName === "projects") {
    projectId = recordId;
    projectType = (record.project_type as string) ?? null;
  } else if (tableName === "opportunities") {
    projectType = (record.project_type as string) ?? null;
    const { data: project } = await supabase.from("projects").select("id").eq("opportunity_id", recordId).maybeSingle();
    projectId = project?.id ?? null;
  } else {
    // jobs and dispositions have project_id directly
    projectId = (record.project_id as string) ?? null;
    if (projectId) {
      const { data: project } = await supabase.from("projects").select("project_type").eq("id", projectId).single();
      projectType = (project?.project_type as string) ?? null;
    }
  }

  return { projectId, projectType, entityId };
}

// ── Normalize project_type for comparison ────────────────────────────────────
// DB stores "Scattered Lot"; templates store "scattered_lot" or "all".

function normalizeProjectType(raw: string | null): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/[\s-]+/g, "_");
}

// ── Determine initial task status based on gates & dependencies ──────────────

function resolveTaskStatus(task: TemplateTask, allTasks: TemplateTask[]): "active" | "blocked" {
  // Blocked if the task explicitly depends on another task
  if (task.depends_on) return "blocked";

  // Blocked if any gate task has a lower sort_order (task is "behind" a gate)
  const hasGateAhead = allTasks.some((t) => t.is_gate && t.sort_order < task.sort_order);
  if (hasGateAhead) return "blocked";

  return "active";
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { table_name, record_id, new_status } = payload;

    if (!table_name || !record_id || new_status === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields: table_name, record_id, new_status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recordType = TABLE_TO_RECORD_TYPE[table_name];
    if (!recordType) {
      return new Response(JSON.stringify({ error: `Unsupported table: ${table_name}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client — bypasses RLS (called from DB trigger, no user context)
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // ── 1. Fetch the triggering record ─────────────────────────────────────
    const { data: record, error: recordError } = await supabase
      .from(table_name)
      .select("*")
      .eq("id", record_id)
      .single();

    if (recordError || !record) {
      throw recordError ?? new Error(`Record ${record_id} not found in ${table_name}`);
    }

    // ── 2. Query matching workflow templates ───────────────────────────────
    const { data: templates, error: tplError } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("trigger_table", table_name)
      .eq("trigger_value", new_status)
      .eq("is_active", true);

    if (tplError) throw tplError;

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: "No matching workflow templates", instances: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Resolve project context & filter by project_type ────────────────
    const { projectId, projectType, entityId } = await resolveProjectContext(supabase, table_name, record_id, record);
    const normalizedRecordType = normalizeProjectType(projectType);

    const compatibleTemplates = templates.filter((t) => {
      if (!t.project_type || t.project_type === "all") return true;
      return t.project_type === normalizedRecordType;
    });

    if (compatibleTemplates.length === 0) {
      return new Response(JSON.stringify({ message: "No project-type-compatible templates", instances: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Resolve team role assignments ────────────────────────────────────
    const roleAssignments = await resolveTeamAssignments(supabase, recordType, record_id, projectId);

    // ── 5. Create workflow instances + task instances ───────────────────────
    const createdInstances: string[] = [];
    const triggerDate = new Date();

    for (const template of compatibleTemplates) {
      // Fetch ordered template tasks
      const { data: templateTasks, error: tasksError } = await supabase
        .from("workflow_template_tasks")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order");

      if (tasksError) throw tasksError;
      if (!templateTasks || templateTasks.length === 0) continue;

      // Create the workflow instance
      const { data: instance, error: instError } = await supabase
        .from("workflow_instances")
        .insert({
          template_id: template.id,
          record_type: recordType,
          record_id,
          project_id: projectId,
          entity_id: entityId,
          name: template.name,
          status: "active",
          trigger_date: triggerDate.toISOString(),
          progress_pct: 0,
        })
        .select()
        .single();

      if (instError || !instance) {
        console.error("Failed to create workflow instance:", instError);
        continue;
      }

      // Build task instance rows
      const taskRows = (templateTasks as TemplateTask[]).map((task) => {
        const status = resolveTaskStatus(task, templateTasks as TemplateTask[]);
        const assignedTo = roleAssignments[task.assigned_role] ?? null;
        const dueDate = new Date(triggerDate.getTime() + task.due_days * 86_400_000);

        return {
          workflow_instance_id: instance.id,
          template_task_id: task.id,
          name: task.name,
          description: task.description,
          phase: task.phase,
          status,
          assigned_to: assignedTo,
          assigned_role: task.assigned_role,
          due_date: dueDate.toISOString(),
          is_gate: task.is_gate,
          record_type: recordType,
          record_id,
          project_id: projectId,
          sort_order: task.sort_order,
        };
      });

      const { error: insertTasksError } = await supabase.from("task_instances").insert(taskRows);

      if (insertTasksError) {
        console.error("Failed to create task instances:", insertTasksError);
        continue;
      }

      // ── 6. Update progress_pct ─────────────────────────────────────────
      // All tasks start as active/blocked, so progress is 0%.
      // Future task completions will update this via the recalculate_workflow_progress trigger.
      await supabase.from("workflow_instances").update({ progress_pct: 0 }).eq("id", instance.id);

      createdInstances.push(instance.id);
    }

    return new Response(
      JSON.stringify({
        message: `Created ${createdInstances.length} workflow instance(s)`,
        instances: createdInstances,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Workflow engine error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
