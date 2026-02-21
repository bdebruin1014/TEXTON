/**
 * Registry of all template variables available per record type.
 * Used by the VariablePicker to show available placeholders.
 */

export interface TemplateVariable {
  key: string;
  label: string;
  description?: string;
}

export interface VariableGroup {
  label: string;
  variables: TemplateVariable[];
}

const COMMON_VARIABLES: VariableGroup = {
  label: "System",
  variables: [
    { key: "_today", label: "Today's Date", description: "YYYY-MM-DD" },
    { key: "_year", label: "Current Year" },
    { key: "_generated_at", label: "Generated Timestamp" },
  ],
};

const ENTITY_VARIABLES: VariableGroup = {
  label: "Entity",
  variables: [
    { key: "entity.name", label: "Entity Name" },
    { key: "entity.entity_type", label: "Entity Type" },
  ],
};

export const RECORD_TYPE_VARIABLES: Record<string, VariableGroup[]> = {
  opportunity: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "Opportunity",
      variables: [
        { key: "opportunity_name", label: "Opportunity Name" },
        { key: "status", label: "Status" },
        { key: "project_type", label: "Project Type" },
        { key: "source", label: "Source" },
        { key: "priority", label: "Priority" },
        { key: "estimated_value", label: "Estimated Value" },
        { key: "assigned_to", label: "Assigned To" },
        { key: "address_street", label: "Street" },
        { key: "address_city", label: "City" },
        { key: "address_state", label: "State" },
        { key: "address_zip", label: "ZIP" },
        { key: "offer_amount", label: "Offer Amount" },
        { key: "contract_price", label: "Contract Price" },
        { key: "closing_date", label: "Closing Date" },
        { key: "record_number", label: "Record Number" },
      ],
    },
  ],
  project: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "Project",
      variables: [
        { key: "project_name", label: "Project Name" },
        { key: "status", label: "Status" },
        { key: "project_type", label: "Project Type" },
        { key: "total_budget", label: "Total Budget" },
        { key: "total_lots", label: "Total Lots" },
        { key: "address_street", label: "Street" },
        { key: "address_city", label: "City" },
        { key: "address_state", label: "State" },
        { key: "lender_name", label: "Lender" },
        { key: "loan_amount", label: "Loan Amount" },
        { key: "record_number", label: "Record Number" },
      ],
    },
  ],
  job: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "Job",
      variables: [
        { key: "lot_number", label: "Lot Number" },
        { key: "floor_plan_name", label: "Floor Plan" },
        { key: "project_name", label: "Project Name" },
        { key: "status", label: "Status" },
        { key: "builder", label: "Builder" },
        { key: "start_date", label: "Start Date" },
        { key: "target_completion", label: "Target Completion" },
        { key: "budget_total", label: "Budget Total" },
        { key: "contract_amount", label: "Contract Amount" },
        { key: "record_number", label: "Record Number" },
      ],
    },
  ],
  disposition: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "Disposition",
      variables: [
        { key: "lot_number", label: "Lot Number" },
        { key: "project_name", label: "Project Name" },
        { key: "address", label: "Address" },
        { key: "buyer_name", label: "Buyer Name" },
        { key: "buyer_email", label: "Buyer Email" },
        { key: "contract_price", label: "Contract Price" },
        { key: "closing_date", label: "Closing Date" },
        { key: "status", label: "Status" },
        { key: "record_number", label: "Record Number" },
      ],
    },
  ],
  matter: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "Matter",
      variables: [
        { key: "title", label: "Matter Title" },
        { key: "matter_number", label: "Matter Number" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
      ],
    },
  ],
  rch_contract: [
    COMMON_VARIABLES,
    ENTITY_VARIABLES,
    {
      label: "RCH Contract",
      variables: [
        { key: "contract_number", label: "Contract Number" },
        { key: "client_name", label: "Client Name" },
        { key: "contract_type", label: "Contract Type" },
        { key: "status", label: "Status" },
        { key: "unit_count", label: "Unit Count" },
        { key: "contract_amount", label: "Contract Amount" },
        { key: "effective_date", label: "Effective Date" },
        { key: "record_number", label: "Record Number" },
      ],
    },
  ],
};

export function getVariablesForRecordType(recordType: string): VariableGroup[] {
  return RECORD_TYPE_VARIABLES[recordType] ?? [COMMON_VARIABLES];
}
