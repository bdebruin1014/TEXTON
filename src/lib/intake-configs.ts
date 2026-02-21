// ── Types ──────────────────────────────────────────────────────────────

export interface IntakeStep {
  id: string;
  prompt: string;
  placeholder: string;
  stateKey: string;
  showRecordLinker?: boolean;
  showFileUpload?: boolean;
}

export interface PreviewField {
  key: string;
  label: string;
  type: "text" | "badge" | "currency" | "date" | "list";
  deriveFrom?: string;
}

export interface IntakeModuleConfig {
  moduleKey: string;
  label: string;
  pluralLabel: string;
  storageBucket: string;
  steps: IntakeStep[];
  previewFields: PreviewField[];
  edgeFunctionName: string;
  listRoute: string;
  detailRoute: string;
  detailParamKey: string;
  breadcrumbs: string[];
}

// ── Module Configurations ──────────────────────────────────────────────

export const PIPELINE_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "pipeline",
  label: "Opportunity",
  pluralLabel: "Pipeline",
  storageBucket: "opportunity-documents",
  steps: [
    {
      id: "situation",
      prompt: "Describe this opportunity. You can paste an email, listing details, or just describe the deal.",
      placeholder: "Paste an email, listing sheet details, or describe the deal...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt:
        "What's the property info? Address, acreage, lot count, asking price \u2014 anything you know. You can also link existing records.",
      placeholder: "Address, acreage, lot count, asking price...",
      stateKey: "detailsText",
      showRecordLinker: true,
    },
    {
      id: "documents",
      prompt: "Upload any documents \u2014 listing sheets, tax maps, aerials, appraisals.",
      placeholder: "",
      stateKey: "documentsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "name", label: "Suggested Name", type: "text", deriveFrom: "situationText" },
    { key: "status", label: "Status", type: "badge" },
    { key: "estimated_value", label: "Estimated Value", type: "currency" },
    { key: "property_address", label: "Property Address", type: "text" },
    { key: "acreage", label: "Acreage", type: "text" },
    { key: "lot_count", label: "Lot Count", type: "text" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/pipeline",
  detailRoute: "/pipeline/$opportunityId/basic-info",
  detailParamKey: "opportunityId",
  breadcrumbs: ["Pipeline", "New Opportunity"],
};

export const PROJECTS_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "projects",
  label: "Project",
  pluralLabel: "Projects",
  storageBucket: "project-documents",
  steps: [
    {
      id: "situation",
      prompt: "Describe this project. Paste deal details, partnership terms, or project overview.",
      placeholder: "Paste deal details, partnership terms, or describe the project...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt:
        "What type of project is this? Provide location, entity, lot count, timeline details. You can also link existing records.",
      placeholder: "Project type, location, entity, lot count, timeline...",
      stateKey: "detailsText",
      showRecordLinker: true,
    },
    {
      id: "documents",
      prompt: "Upload any documents \u2014 site plans, surveys, partnership agreements.",
      placeholder: "",
      stateKey: "documentsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "name", label: "Project Name", type: "text", deriveFrom: "situationText" },
    { key: "project_type", label: "Type", type: "badge" },
    { key: "status", label: "Status", type: "badge" },
    { key: "entity", label: "Entity", type: "text" },
    { key: "lot_count", label: "Lot Count", type: "text" },
    { key: "location", label: "Location", type: "text" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/projects",
  detailRoute: "/projects/$projectId/basic-info",
  detailParamKey: "projectId",
  breadcrumbs: ["Projects", "New Project"],
};

export const CONSTRUCTION_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "construction",
  label: "Job",
  pluralLabel: "Construction",
  storageBucket: "job-documents",
  steps: [
    {
      id: "situation",
      prompt: "Describe this construction job. Include the lot, plan, and any specs you have.",
      placeholder: "Describe the lot, plan, and specs...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt:
        "Any additional details? Buyer info, plan selections, start date, permit status. You can also link existing records.",
      placeholder: "Buyer info, plan selections, start date, permit status...",
      stateKey: "detailsText",
      showRecordLinker: true,
    },
    {
      id: "documents",
      prompt: "Upload documents \u2014 permits, plans, specs, buyer selections.",
      placeholder: "",
      stateKey: "documentsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "lot_number", label: "Lot Number", type: "text" },
    { key: "floor_plan", label: "Floor Plan", type: "text" },
    { key: "status", label: "Status", type: "badge" },
    { key: "project", label: "Project", type: "text" },
    { key: "buyer", label: "Buyer", type: "text" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/construction",
  detailRoute: "/construction/$jobId/job-info",
  detailParamKey: "jobId",
  breadcrumbs: ["Construction", "New Job"],
};

export const DISPOSITION_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "disposition",
  label: "Disposition",
  pluralLabel: "Disposition",
  storageBucket: "disposition-documents",
  steps: [
    {
      id: "situation",
      prompt: "Describe this disposition/sale. Paste buyer inquiry, contract details, or listing info.",
      placeholder: "Paste buyer inquiry, contract details, or describe the sale...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt:
        "What are the key terms? Sale price, buyer name, lot, expected close date. You can also link existing records.",
      placeholder: "Sale price, buyer name, lot, expected close date...",
      stateKey: "detailsText",
      showRecordLinker: true,
    },
    {
      id: "documents",
      prompt: "Upload documents \u2014 purchase agreements, earnest money receipts, buyer qualification.",
      placeholder: "",
      stateKey: "documentsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "buyer_name", label: "Buyer Name", type: "text" },
    { key: "lot", label: "Lot", type: "text" },
    { key: "sale_price", label: "Sale Price", type: "currency" },
    { key: "status", label: "Status", type: "badge" },
    { key: "expected_close", label: "Expected Close", type: "date" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/disposition",
  detailRoute: "/disposition/$dispositionId/overview",
  detailParamKey: "dispositionId",
  breadcrumbs: ["Disposition", "New Disposition"],
};

export const CONTACTS_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "contacts",
  label: "Company",
  pluralLabel: "Contacts",
  storageBucket: "contact-documents",
  steps: [
    {
      id: "situation",
      prompt: "Tell me about this company. Paste an email signature, website info, or describe them.",
      placeholder: "Paste an email signature, website info, or describe the company...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt: "Any additional details? Contact people, specialties, past projects together.",
      placeholder: "Contact people, specialties, past projects...",
      stateKey: "detailsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "name", label: "Company Name", type: "text", deriveFrom: "situationText" },
    { key: "type", label: "Type", type: "badge" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "website", label: "Website", type: "text" },
    { key: "key_contacts", label: "Key Contacts", type: "list" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/contacts",
  detailRoute: "/contacts/$companyId",
  detailParamKey: "companyId",
  breadcrumbs: ["Contacts", "New Company"],
};

export const INVESTORS_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "investors",
  label: "Fund",
  pluralLabel: "Investors",
  storageBucket: "investor-documents",
  steps: [
    {
      id: "situation",
      prompt: "Describe this fund or investment vehicle. Paste investor communications, fund docs, or term sheets.",
      placeholder: "Paste investor communications, fund docs, or describe the fund...",
      stateKey: "situationText",
    },
    {
      id: "details",
      prompt: "What are the fund details? Type, vintage year, target size, GP/LP split.",
      placeholder: "Fund type, vintage year, target size, GP/LP split...",
      stateKey: "detailsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "name", label: "Fund Name", type: "text", deriveFrom: "situationText" },
    { key: "type", label: "Type", type: "badge" },
    { key: "vintage_year", label: "Vintage Year", type: "text" },
    { key: "target_size", label: "Target Size", type: "currency" },
    { key: "status", label: "Status", type: "badge" },
  ],
  edgeFunctionName: "generate-record",
  listRoute: "/investors",
  detailRoute: "/investors/$fundId",
  detailParamKey: "fundId",
  breadcrumbs: ["Investors", "New Fund"],
};

export const MATTERS_INTAKE_CONFIG: IntakeModuleConfig = {
  moduleKey: "matters",
  label: "Matter",
  pluralLabel: "Matters",
  storageBucket: "matter-documents",
  steps: [
    {
      id: "situation",
      prompt: "Let's create a new matter. Describe the situation \u2014 what's going on?",
      placeholder: "Describe the situation...",
      stateKey: "situationText",
    },
    {
      id: "relevant_info",
      prompt:
        "Tell me about the relevant parties and any important background. You can also search and link existing records below.",
      placeholder: "Describe parties and background...",
      stateKey: "relevantInfoText",
      showRecordLinker: true,
    },
    {
      id: "goals",
      prompt: "What's the desired outcome? What needs to happen, and by when?",
      placeholder: "Describe desired outcome and timeline...",
      stateKey: "goalsText",
    },
    {
      id: "documents",
      prompt: "Upload any relevant documents (optional). When ready, click 'Create Matter' below.",
      placeholder: "",
      stateKey: "documentsText",
      showFileUpload: true,
    },
  ],
  previewFields: [
    { key: "title", label: "Suggested Title", type: "text", deriveFrom: "situationText" },
    { key: "category", label: "Category", type: "badge" },
    { key: "situation", label: "Situation", type: "text" },
    { key: "goals", label: "Goals / Desired Outcome", type: "text" },
    { key: "priority", label: "Priority", type: "badge" },
    { key: "target_date", label: "Target Date", type: "date" },
  ],
  edgeFunctionName: "generate-matter",
  listRoute: "/operations/matters",
  detailRoute: "/operations/matters/$matterId",
  detailParamKey: "matterId",
  breadcrumbs: ["Operations", "Matters", "New Matter"],
};

// ── Registry ───────────────────────────────────────────────────────────

export const INTAKE_CONFIGS: Record<string, IntakeModuleConfig> = {
  pipeline: PIPELINE_INTAKE_CONFIG,
  projects: PROJECTS_INTAKE_CONFIG,
  construction: CONSTRUCTION_INTAKE_CONFIG,
  disposition: DISPOSITION_INTAKE_CONFIG,
  contacts: CONTACTS_INTAKE_CONFIG,
  investors: INVESTORS_INTAKE_CONFIG,
  matters: MATTERS_INTAKE_CONFIG,
};
