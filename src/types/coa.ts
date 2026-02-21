export interface COATemplate {
  id: string;
  name: string;
  description: string | null;
  entity_types: string[];
  is_default: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface COATemplateItem {
  id: string;
  template_id: string;
  account_number: string;
  account_name: string;
  parent_account: string | null;
  account_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  is_group: boolean;
  root_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" | null;
  is_required: boolean;
  description: string | null;
  sort_order: number;
}

export interface EntityCOAAssignment {
  id: string;
  entity_id: string;
  template_id: string;
  assigned_at: string;
  assigned_by: string | null;
  variables: COAVariables;
}

export interface COAVariables {
  ABBR?: string;
  MEMBER_1_NAME?: string;
  MEMBER_2_NAME?: string;
  [key: string]: string | undefined;
}

export interface PopulatedAccount {
  account_number: string;
  account_name: string;
  parent_account: string | null;
  account_type: string;
  is_group: boolean;
  root_type: string | null;
  is_required: boolean;
  description: string | null;
}
