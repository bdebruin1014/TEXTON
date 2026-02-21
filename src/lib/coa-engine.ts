import type { COATemplateItem, COAVariables, PopulatedAccount } from "@/types/coa";

/**
 * Substitutes template variables (e.g. {{ABBR}}, {{MEMBER_1_NAME}}) in account names
 * and returns populated account objects ready for insertion into chart_of_accounts.
 */
export function populateTemplate(items: COATemplateItem[], variables: COAVariables): PopulatedAccount[] {
  return items.map((item) => ({
    account_number: item.account_number,
    account_name: substituteVariables(item.account_name, variables),
    parent_account: item.parent_account,
    account_type: item.account_type,
    is_group: item.is_group,
    root_type: item.root_type,
    is_required: item.is_required,
    description: item.description ? substituteVariables(item.description, variables) : null,
  }));
}

function substituteVariables(text: string, variables: COAVariables): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

/**
 * Decision tree: given entity type, return the matching COA template name.
 */
export function getTemplateNameForEntityType(entityType: string): string {
  const normalized = entityType.toLowerCase().replace(/[_\s-]+/g, "_");

  if (normalized.includes("operating") || normalized === "llc" || normalized === "corp") {
    return "Operating Company";
  }

  if (normalized.includes("scattered")) {
    return "SPE - Scattered Lot";
  }

  if (normalized.includes("community")) {
    return "SPE - Community Development";
  }

  if (normalized.includes("lot_dev") || normalized.includes("lot_development")) {
    return "SPE - Lot Development";
  }

  if (normalized.includes("lot_purchase")) {
    return "SPE - Lot Purchase Only";
  }

  // Default for SPE types not matched above
  if (normalized.includes("spe")) {
    return "SPE - Scattered Lot";
  }

  return "Operating Company";
}
