export const OPPORTUNITY_STATUSES = [
  "New Lead",
  "Qualifying",
  "Analyzing",
  "Due Diligence",
  "Under Contract",
  "Closed Won",
  "Closed Lost",
  "On Hold",
] as const;

export const PROJECT_STATUSES = [
  "Pre-Development",
  "Entitlement",
  "Horizontal",
  "Vertical",
  "Closeout",
  "Completed",
  "On Hold",
] as const;

export const JOB_STATUSES = [
  "Pre-Construction",
  "Permitting",
  "Foundation",
  "Framing",
  "Rough-Ins",
  "Insulation & Drywall",
  "Interior Finishes",
  "Exterior",
  "Final Inspections",
  "CO Issued",
  "Warranty",
  "Closed",
] as const;

export const LOT_STATUSES = [
  "Future",
  "Available",
  "Reserved",
  "Assigned",
  "Under Construction",
  "Completed",
  "Listed",
  "Under Contract",
  "Closed",
] as const;

export const DISPOSITION_STATUSES = [
  "Lead",
  "Reserved",
  "Under Contract",
  "Option Selections",
  "Builder Walk",
  "Closing Scheduled",
  "Closed",
  "Cancelled",
] as const;

export const ESIGN_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Partially Signed",
  "Completed",
  "Declined",
  "Voided",
  "Expired",
] as const;

export const RCH_CONTRACT_STATUSES = [
  "Draft",
  "In Progress",
  "Pending Signature",
  "Executed",
  "Jobs Created",
  "Cancelled",
] as const;

export const PROJECT_TYPES = ["Scattered Lot", "Community Development", "Lot Development", "Lot Purchase"] as const;

export const COST_BOOK_STATUSES = ["Draft", "Active", "Archived"] as const;

export const ENTITY_TYPES = ["LLC", "LP", "Corp", "Trust", "Individual"] as const;

export const COMPANY_TYPE_CATEGORIES = [
  {
    label: "Closing",
    types: ["Lender", "Mortgage Brokerage", "Law Firm", "Title Company"],
  },
  {
    label: "Soft Costs",
    types: [
      "Architect",
      "Engineer",
      "Surveyor",
      "Appraiser",
      "Interior Designer",
      "Land Planner",
      "Environmental Consultant",
    ],
  },
  {
    label: "Hard Costs",
    types: [
      "General Contractor",
      "Subcontractor",
      "Material Supplier",
      "Equipment Rental",
      "Concrete / Flatwork",
      "Framing",
      "Electrical",
      "Plumbing",
      "HVAC",
      "Roofing",
      "Grading / Sitework",
    ],
  },
  {
    label: "Investors",
    types: ["Family Office", "REIT", "Private Equity", "Fund / LP", "HNW Individual", "Institutional", "JV Partner"],
  },
  {
    label: "Government",
    types: ["Municipality", "County", "State Agency", "Tax Authority", "Utility Provider"],
  },
  {
    label: "Other",
    types: ["Insurance", "Real Estate Brokerage", "HOA", "Property Manager", "Other"],
  },
] as const;

export const COMPANY_TYPES = COMPANY_TYPE_CATEGORIES.flatMap((c) => c.types);

export const MATTER_STATUSES = ["open", "in_progress", "on_hold", "resolved", "closed", "cancelled"] as const;

export const MATTER_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const MATTER_CATEGORIES = [
  "contract_dispute",
  "refinance",
  "insurance_claim",
  "legal",
  "compliance",
  "zoning",
  "permitting",
  "partnership",
  "vendor_dispute",
  "title_issue",
  "environmental",
  "tax",
  "investor_relations",
  "construction_defect",
  "other",
] as const;

export const MATTER_CATEGORY_LABELS: Record<string, string> = {
  contract_dispute: "Contract Dispute",
  refinance: "Refinance",
  insurance_claim: "Insurance Claim",
  legal: "Legal",
  compliance: "Compliance",
  zoning: "Zoning",
  permitting: "Permitting",
  partnership: "Partnership",
  vendor_dispute: "Vendor Dispute",
  title_issue: "Title Issue",
  environmental: "Environmental",
  tax: "Tax",
  investor_relations: "Investor Relations",
  construction_defect: "Construction Defect",
  other: "Other",
};

export const MATTER_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const PO_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "In Progress",
  "Complete",
  "Invoiced",
  "Paid",
  "Void",
] as const;

export const FIXED_PER_HOUSE_FEES = {
  builder_fee: 15_000,
  am_fee: 5_000, // RCH-related entities only
  builder_warranty: 5_000,
  builders_risk: 1_500,
  po_fee: 3_000, // was "purchaser_fee"
  bookkeeping: 1_500, // was "accounting_fee"
  pm_fee: 3_500,
  utilities: 1_400,
} as const;

// Total per-house: $35,400 (RCH-related) or $30,400 (third-party, no AM fee)
export const totalFixedPerHouse = (isRchRelated: boolean) =>
  Object.entries(FIXED_PER_HOUSE_FEES).reduce(
    (sum, [key, val]) => sum + (key === "am_fee" && !isRchRelated ? 0 : val),
    0,
  );

// Builder Fee formula (Section 6 of contract budget): GREATER of $25K or 10% of Sections 1-5
export const computeBuilderFee = (sections1to5: number) => Math.max(25_000, sections1to5 * 0.1);

// Contingency formula (Section 7): CAPPED at lower of $10K or 5% of Sections 1-5
export const computeContingency = (sections1to5: number) => Math.min(10_000, sections1to5 * 0.05);

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Opportunity — muted/desaturated v3.2
  "New Lead": { bg: "bg-info-bg", text: "text-info-text" },
  Qualifying: { bg: "bg-info-bg", text: "text-info-text" },
  Analyzing: { bg: "bg-info-bg", text: "text-info-text" },
  "Due Diligence": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Under Contract": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Closed Won": { bg: "bg-success-bg", text: "text-success-text" },
  "Closed Lost": { bg: "bg-destructive-bg", text: "text-destructive-text" },
  "On Hold": { bg: "bg-accent", text: "text-muted-foreground" },

  // Project
  "Pre-Development": { bg: "bg-info-bg", text: "text-info-text" },
  Entitlement: { bg: "bg-info-bg", text: "text-info-text" },
  Horizontal: { bg: "bg-warning-bg", text: "text-warning-text" },
  Vertical: { bg: "bg-warning-bg", text: "text-warning-text" },
  Closeout: { bg: "bg-warning-bg", text: "text-warning-text" },
  Completed: { bg: "bg-success-bg", text: "text-success-text" },

  // Job
  "Pre-Construction": { bg: "bg-info-bg", text: "text-info-text" },
  Permitting: { bg: "bg-info-bg", text: "text-info-text" },
  Foundation: { bg: "bg-info-bg", text: "text-info-text" },
  Framing: { bg: "bg-warning-bg", text: "text-warning-text" },
  "Rough-Ins": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Insulation & Drywall": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Interior Finishes": { bg: "bg-warning-bg", text: "text-warning-text" },
  Exterior: { bg: "bg-warning-bg", text: "text-warning-text" },
  "Final Inspections": { bg: "bg-warning-bg", text: "text-warning-text" },
  "CO Issued": { bg: "bg-success-bg", text: "text-success-text" },
  Warranty: { bg: "bg-success-bg", text: "text-success-text" },
  Closed: { bg: "bg-accent", text: "text-muted-foreground" },

  // Lot
  Future: { bg: "bg-accent", text: "text-muted-foreground" },
  Available: { bg: "bg-success-bg", text: "text-success-text" },
  Reserved: { bg: "bg-warning-bg", text: "text-warning-text" },
  Assigned: { bg: "bg-info-bg", text: "text-info-text" },
  "Under Construction": { bg: "bg-warning-bg", text: "text-warning-text" },
  Listed: { bg: "bg-info-bg", text: "text-info-text" },

  // Disposition
  Lead: { bg: "bg-info-bg", text: "text-info-text" },
  "Option Selections": { bg: "bg-info-bg", text: "text-info-text" },
  "Builder Walk": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Closing Scheduled": { bg: "bg-warning-bg", text: "text-warning-text" },
  Cancelled: { bg: "bg-destructive-bg", text: "text-destructive-text" },

  // PO
  Active: { bg: "bg-success-bg", text: "text-success-text" },
  Archived: { bg: "bg-info-bg", text: "text-info-text" },
  Draft: { bg: "bg-accent", text: "text-muted-foreground" },
  Submitted: { bg: "bg-info-bg", text: "text-info-text" },
  Approved: { bg: "bg-success-bg", text: "text-success-text" },
  "In Progress": { bg: "bg-warning-bg", text: "text-warning-text" },
  Complete: { bg: "bg-success-bg", text: "text-success-text" },
  Invoiced: { bg: "bg-info-bg", text: "text-info-text" },
  Paid: { bg: "bg-success-bg", text: "text-success-text" },
  Void: { bg: "bg-destructive-bg", text: "text-destructive-text" },

  // E-Sign
  Sent: { bg: "bg-info-bg", text: "text-info-text" },
  Viewed: { bg: "bg-info-bg", text: "text-info-text" },
  "Partially Signed": { bg: "bg-warning-bg", text: "text-warning-text" },
  Declined: { bg: "bg-destructive-bg", text: "text-destructive-text" },
  Voided: { bg: "bg-accent", text: "text-muted-foreground" },
  Expired: { bg: "bg-warning-bg", text: "text-warning-text" },

  // Matter
  open: { bg: "bg-info-bg", text: "text-info-text" },
  in_progress: { bg: "bg-warning-bg", text: "text-warning-text" },
  on_hold: { bg: "bg-accent", text: "text-muted-foreground" },
  resolved: { bg: "bg-success-bg", text: "text-success-text" },
  cancelled: { bg: "bg-destructive-bg", text: "text-destructive-text" },

  // Matter Priority
  critical: { bg: "bg-destructive-bg", text: "text-destructive-text" },
  high: { bg: "bg-warning-bg", text: "text-warning-text" },
  medium: { bg: "bg-info-bg", text: "text-info-text" },
  low: { bg: "bg-accent", text: "text-muted-foreground" },
};

export const NAV_MODULES = [
  { label: "Pipeline", path: "/pipeline" },
  { label: "Projects", path: "/projects" },
  { label: "Construction", path: "/construction" },
  { label: "Disposition", path: "/disposition" },
  { label: "Accounting", path: "/accounting" },
  { label: "Contacts", path: "/contacts" },
  { label: "Calendar", path: "/calendar" },
  { label: "Admin", path: "/admin" },
] as const;

// Teams
export const TEAM_TYPES = ["department", "project", "ad_hoc"] as const;
export const TEAM_TYPE_LABELS: Record<string, string> = {
  department: "Department",
  project: "Project Team",
  ad_hoc: "Ad Hoc",
};
export const TEAM_MEMBER_ROLES = ["lead", "member", "viewer"] as const;
export const ASSIGNMENT_ROLES = ["responsible", "accountable", "consulted", "informed"] as const;
export const ASSIGNABLE_RECORD_TYPES = [
  "opportunity",
  "project",
  "job",
  "disposition",
  "matter",
  "rch_contract",
] as const;

// COA Template System
export const COA_TEMPLATE_ENTITY_TYPE_MAP: Record<string, string> = {
  operating: "Operating Company",
  spe_scattered_lot: "SPE - Scattered Lot",
  spe_community_dev: "SPE - Community Development",
  spe_lot_dev: "SPE - Lot Development",
  spe_lot_purchase: "SPE - Lot Purchase Only",
};

export const COA_VARIABLE_KEYS = ["ABBR", "MEMBER_1_NAME", "MEMBER_2_NAME"] as const;

export const ENTITY_COA_TYPES = [
  { value: "operating", label: "Operating Company" },
  { value: "spe_scattered_lot", label: "SPE - Scattered Lot" },
  { value: "spe_community_dev", label: "SPE - Community Development" },
  { value: "spe_lot_dev", label: "SPE - Lot Development" },
  { value: "spe_lot_purchase", label: "SPE - Lot Purchase Only" },
] as const;

export const OPS_DROPDOWN_SECTIONS = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", path: "/operations" },
      { label: "Workflows", path: "/workflows" },
      { label: "E-Signatures", path: "/operations/esign" },
      { label: "RCH Contracts", path: "/operations/rch-contracts" },
      { label: "Matters", path: "/operations/matters" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Deal Analyzer", path: "/tools/deal-analyzer" },
      { label: "Community Proforma", path: "/tools/community-proforma" },
      { label: "Lot Dev Proforma", path: "/tools/lot-dev-proforma" },
      { label: "Lot Purchase Proforma", path: "/tools/lot-purchase-proforma" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Reports Dashboard", path: "/reports" },
      { label: "Custom Reports", path: "/reports/custom" },
      { label: "Subscribed Reports", path: "/reports/subscribed" },
    ],
  },
] as const;
