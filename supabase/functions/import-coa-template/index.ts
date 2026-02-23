import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const slug = formData.get("slug") as string | null;
    const description = formData.get("description") as string | null;
    const entityTypes = formData.get("entity_types") as string | null;
    const isDefault = formData.get("is_default") === "true";

    if (!file || !name) {
      return new Response(JSON.stringify({ error: "Missing file or name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON array (all rows)
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Skip first 4 header/info rows if they exist
    const dataRows = rawRows.length > 4 ? rawRows.slice(4) : rawRows;

    // Map columns - try common column name patterns
    const accounts: Array<{
      account_number: string;
      account_name: string;
      account_type: string;
      root_type: string | null;
      normal_balance: string | null;
      is_group: boolean;
      parent_account: string | null;
      description: string | null;
      is_required: boolean;
      sort_order: number;
    }> = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      // Try to find the right columns by checking common header names
      const acctNum = String(
        row["Account Number"] ?? row["Acct #"] ?? row["Account #"] ?? row["Number"] ?? row["account_number"] ?? ""
      ).trim();
      const acctName = String(
        row["Account Name"] ?? row["Name"] ?? row["Account"] ?? row["account_name"] ?? ""
      ).trim();
      const acctType = String(
        row["Account Type"] ?? row["Type"] ?? row["account_type"] ?? ""
      ).trim();
      const rootType = String(
        row["Root Type"] ?? row["root_type"] ?? row["Root"] ?? ""
      ).trim();
      const normalBal = String(
        row["Normal Balance"] ?? row["normal_balance"] ?? row["Balance"] ?? ""
      ).trim();
      const isGroup = String(
        row["Is Group"] ?? row["Group"] ?? row["is_group"] ?? ""
      ).trim().toLowerCase();
      const parentAcct = String(
        row["Parent Account"] ?? row["Parent"] ?? row["parent_account"] ?? ""
      ).trim();
      const desc = String(
        row["Description"] ?? row["description"] ?? ""
      ).trim();

      // Skip empty rows
      if (!acctNum && !acctName) continue;

      // Determine account_type - validate against allowed values
      const validTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
      let mappedType = validTypes.find((t) => t.toLowerCase() === acctType.toLowerCase()) ?? "";
      if (!mappedType && rootType) {
        mappedType = validTypes.find((t) => t.toLowerCase() === rootType.toLowerCase()) ?? "";
      }
      if (!mappedType) mappedType = "Asset"; // fallback

      // Determine normal_balance
      let balance: string | null = null;
      if (normalBal && (normalBal === "Debit" || normalBal === "Credit")) {
        balance = normalBal;
      } else {
        balance = mappedType === "Asset" || mappedType === "Expense" ? "Debit" : "Credit";
      }

      accounts.push({
        account_number: acctNum || String(1000 + i),
        account_name: acctName || `Account ${i + 1}`,
        account_type: mappedType,
        root_type: rootType || mappedType,
        normal_balance: balance,
        is_group: isGroup === "true" || isGroup === "yes" || isGroup === "1",
        parent_account: parentAcct || null,
        description: desc || null,
        is_required: true,
        sort_order: i + 1,
      });
    }

    if (accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No accounts found in file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Generate slug from name if not provided
    const templateSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Parse entity_types from comma-separated string
    const parsedEntityTypes = entityTypes
      ? entityTypes.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    // Insert template
    const { data: template, error: templateError } = await supabase
      .from("coa_templates")
      .insert({
        name,
        slug: templateSlug,
        description,
        entity_types: parsedEntityTypes,
        is_default: isDefault,
        is_active: true,
        account_count: accounts.length,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (templateError) {
      console.error("Template insert error:", templateError);
      return new Response(JSON.stringify({ error: "Failed to create template", details: templateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk insert accounts
    const itemsToInsert = accounts.map((acct) => ({
      template_id: template.id,
      ...acct,
    }));

    const { error: itemsError } = await supabase
      .from("coa_template_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Items insert error:", itemsError);
      // Clean up the template if items fail
      await supabase.from("coa_templates").delete().eq("id", template.id);
      return new Response(JSON.stringify({ error: "Failed to insert accounts", details: itemsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        template_id: template.id,
        accounts_imported: accounts.length,
        name,
        slug: templateSlug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: "Import failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
