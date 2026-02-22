import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instanceId, templateId, recordType, recordId, chatMessages } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch template structure
    const { data: template } = await supabase.from("workflow_templates").select("*").eq("id", templateId).single();

    const { data: templateMilestones } = await supabase
      .from("workflow_milestones")
      .select("*")
      .eq("workflow_id", templateId)
      .order("sort_order");

    const { data: templateTasks } = await supabase
      .from("workflow_tasks")
      .select("*")
      .eq("workflow_id", templateId)
      .order("sort_order");

    // 2. Fetch record context
    const tableMap: Record<string, string> = {
      opportunity: "opportunities",
      project: "projects",
      job: "jobs",
      disposition: "dispositions",
      matter: "matters",
      rch_contract: "rch_contracts",
    };
    const tableName = tableMap[recordType];
    let recordContext = {};
    if (tableName) {
      const { data: record } = await supabase.from(tableName).select("*").eq("id", recordId).single();
      recordContext = record ?? {};
    }

    // 3. Fetch teams assigned to this record
    const { data: recordTeams } = await supabase
      .from("record_teams")
      .select("*, team:teams(id, name, member_count), user:user_profiles(id, full_name, email)")
      .eq("record_type", recordType)
      .eq("record_id", recordId);

    // 4. Call Claude API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    let aiMilestones: Array<{
      name: string;
      sort_order: number;
      tasks: Array<{
        task_name: string;
        description: string;
        due_date: string | null;
        assigned_role: string | null;
        sort_order: number;
      }>;
    }> = [];

    if (anthropicKey) {
      const systemPrompt = `You are a workflow planning assistant for a home builder operations platform.
Given a workflow template, record context, and chat customizations, generate a concrete set of milestones and tasks.

Template: ${JSON.stringify(template?.name)}
Template Milestones: ${JSON.stringify(templateMilestones?.map((m: { name: string; sort_order: number }) => ({ name: m.name, sort_order: m.sort_order })))}
Template Tasks: ${JSON.stringify(templateTasks?.map((t: { task_name: string; milestone_id: string; due_days: number }) => ({ name: t.task_name, milestone_id: t.milestone_id, due_days: t.due_days })))}
Record Context: ${JSON.stringify(recordContext)}
Teams: ${JSON.stringify(recordTeams?.map((rt: { team?: { name: string }; user?: { full_name: string } }) => rt.team?.name ?? rt.user?.full_name))}

Return JSON array of milestones with nested tasks. Each milestone has: name, sort_order, tasks[].
Each task has: task_name, description, due_date (YYYY-MM-DD or null), assigned_role (string or null), sort_order.`;

      const chatHistory = (chatMessages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            ...chatHistory,
            {
              role: "user",
              content: "Generate the workflow milestones and tasks as JSON. Return only the JSON array, no other text.",
            },
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.content?.[0]?.text ?? "[]";
        try {
          // Extract JSON from potential markdown code block
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          aiMilestones = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          console.error("Failed to parse AI response:", text);
        }
      }
    }

    // 5. Fallback: if no AI milestones, create from template
    if (aiMilestones.length === 0 && templateMilestones && templateMilestones.length > 0) {
      const milestoneIdMap = new Map<string, number>();
      aiMilestones = templateMilestones.map((m: { id: string; name: string; sort_order: number }, idx: number) => {
        milestoneIdMap.set(m.id, idx);
        return {
          name: m.name,
          sort_order: m.sort_order,
          tasks: (templateTasks ?? [])
            .filter((t: { milestone_id: string | null }) => t.milestone_id === m.id)
            .map((t: { task_name: string; due_days: number | null; sort_order: number }) => ({
              task_name: t.task_name,
              description: "",
              due_date: t.due_days ? new Date(Date.now() + t.due_days * 86400000).toISOString().split("T")[0] : null,
              assigned_role: null,
              sort_order: t.sort_order,
            })),
        };
      });
    }

    // 6. Insert milestones + tasks
    for (const ms of aiMilestones) {
      const { data: milestone } = await supabase
        .from("workflow_instance_milestones")
        .insert({
          instance_id: instanceId,
          name: ms.name,
          sort_order: ms.sort_order,
          status: "pending",
        })
        .select()
        .single();

      if (milestone && ms.tasks) {
        const taskRows = ms.tasks.map((t) => ({
          instance_id: instanceId,
          milestone_id: milestone.id,
          task_name: t.task_name,
          description: t.description || null,
          due_date: t.due_date || null,
          assigned_role: t.assigned_role || null,
          sort_order: t.sort_order,
          ai_generated: !!anthropicKey,
          status: "pending",
        }));

        if (taskRows.length > 0) {
          await supabase.from("workflow_instance_tasks").insert(taskRows);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, milestoneCount: aiMilestones.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
