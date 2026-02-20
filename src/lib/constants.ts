export const OPPORTUNITY_STATUSES = [
  "New Lead",
  "Researching",
  "Analyzing",
  "Due Diligence",
  "Under Contract",
  "Closed - Won",
  "Closed - Lost",
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

export const PROJECT_TYPES = ["Scattered Lot", "Community Development", "Lot Development", "Lot Purchase"] as const;

export const ENTITY_TYPES = [
  "holding",
  "builder",
  "operating",
  "spe",
  "fund",
  "investor",
] as const;

export const FIXED_PER_HOUSE_FEES = {
  builder_fee: 15_000, // Flat builder fee
  am_fee: 5_000, // Asset Management — ONLY for RCH-related entity owners, paid at sale
  builder_warranty: 5_000, // Warranty reserve
  builders_risk: 1_500, // Builders risk insurance
  purchaser_fee: 3_000, // Purchaser fee (was "PO Fee")
  accounting_fee: 1_500, // Accounting fee
  pm_fee: 3_000, // Project management fee
  utilities: 1_400, // Utility charges during construction
} as const;

// Total per-house: $35,400 (RCH-related) or $30,400 (third-party, no AM fee)
export const totalFixedPerHouse = (isRchRelated: boolean) =>
  Object.entries(FIXED_PER_HOUSE_FEES).reduce(
    (sum, [key, val]) => sum + (key === "am_fee" && !isRchRelated ? 0 : val),
    0,
  );

// Builder Fee formula (Section 6 of contract budget): GREATER of $25K or 10% of Sections 1-5
export const computeBuilderFee = (sections1to5: number) => Math.max(25_000, sections1to5 * 0.1);

// Contingency formula (Section 7): GREATER of $10K or 5% of Sections 1-5
export const computeContingency = (sections1to5: number) => Math.max(10_000, sections1to5 * 0.05);

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Opportunity — muted/desaturated v3.2
  "New Lead": { bg: "bg-info-bg", text: "text-info-text" },
  Researching: { bg: "bg-info-bg", text: "text-info-text" },
  Analyzing: { bg: "bg-info-bg", text: "text-info-text" },
  "Due Diligence": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Under Contract": { bg: "bg-warning-bg", text: "text-warning-text" },
  "Closed - Won": { bg: "bg-success-bg", text: "text-success-text" },
  "Closed - Lost": { bg: "bg-destructive-bg", text: "text-destructive-text" },
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
};

export const NAV_MODULES = [
  { label: "Pipeline", path: "/pipeline" },
  { label: "Projects", path: "/projects" },
  { label: "Construction", path: "/construction" },
  { label: "Disposition", path: "/disposition" },
  { label: "Accounting", path: "/accounting" },
  { label: "Contacts", path: "/contacts" },
  { label: "Workflows", path: "/workflows" },
  { label: "Calendar", path: "/calendar" },
  { label: "Tools", path: "/tools", disabled: true },
  { label: "Admin", path: "/admin" },
] as const;
