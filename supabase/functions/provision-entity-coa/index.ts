import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";

interface ProvisionPayload {
  entity_id: string;
  template_id: string;
  variables: Record<string, string>;
}

function substituteVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: ProvisionPayload = await req.json();
    const { entity_id, template_id, variables } = payload;

    if (!entity_id || !template_id) {
      return new Response(JSON.stringify({ error: "entity_id and template_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify entity exists
    const { data: entity, error: entityError } = await supabase
      .from("entities")
      .select("id, name")
      .eq("id", entity_id)
      .single();

    if (entityError || !entity) {
      return new Response(JSON.stringify({ error: "Entity not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already provisioned
    const { data: existingProvision } = await supabase
      .from("entity_coa_provisions")
      .select("id")
      .eq("entity_id", entity_id)
      .eq("template_id", template_id)
      .maybeSingle();

    if (existingProvision) {
      return new Response(
        JSON.stringify({ error: "Entity already provisioned with this template" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch template accounts ordered by sort_order
    const { data: templateItems, error: itemsError } = await supabase
      .from("coa_template_items")
      .select("*")
      .eq("template_id", template_id)
      .order("sort_order");

    if (itemsError || !templateItems || templateItems.length === 0) {
      return new Response(JSON.stringify({ error: "Template has no accounts" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 1: Insert all accounts WITHOUT parent_id
    const accountsToInsert = templateItems.map((item) => ({
      entity_id,
      account_number: substituteVariables(item.account_number, variables),
      account_name: substituteVariables(item.account_name, variables),
      account_type: item.account_type,
      normal_balance:
        item.normal_balance ||
        (item.account_type === "Asset" || item.account_type === "Expense" ? "Debit" : "Credit"),
      is_active: true,
      is_locked: true,
      is_template_account: true,
      source_template_id: template_id,
    }));

    const { data: insertedAccounts, error: insertError } = await supabase
      .from("chart_of_accounts")
      .insert(accountsToInsert)
      .select("id, account_number");

    if (insertError) {
      console.error("Account insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert accounts", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Phase 2: Build account_number -> id mapping and update parent_id
    const accountMap = new Map<string, string>();
    for (const acct of insertedAccounts) {
      accountMap.set(acct.account_number, acct.id);
    }

    // Update parent_id for items that have a parent_account reference
    let parentUpdates = 0;
    for (const item of templateItems) {
      if (!item.parent_account) continue;
      const childAccountNumber = substituteVariables(item.account_number, variables);
      const parentAccountNumber = substituteVariables(item.parent_account, variables);

      const childId = accountMap.get(childAccountNumber);
      const parentId = accountMap.get(parentAccountNumber);

      if (childId && parentId) {
        const { error: updateError } = await supabase
          .from("chart_of_accounts")
          .update({ parent_id: parentId })
          .eq("id", childId);

        if (!updateError) parentUpdates++;
      }
    }

    // Log the provision
    await supabase.from("entity_coa_provisions").insert({
      entity_id,
      template_id,
      variables,
      accounts_created: insertedAccounts.length,
      provisioned_by: user.id,
    });

    // Update entity_coa_assignments
    await supabase.from("entity_coa_assignments").upsert(
      {
        entity_id,
        template_id,
        variables,
        assigned_by: user.id,
      },
      { onConflict: "entity_id" },
    );

    return new Response(
      JSON.stringify({
        success: true,
        accounts_created: insertedAccounts.length,
        parent_links_created: parentUpdates,
        entity_id,
        template_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Provision error:", err);
    return new Response(JSON.stringify({ error: "Provision failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
