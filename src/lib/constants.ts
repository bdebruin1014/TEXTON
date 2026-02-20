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

export const PROJECT_TYPES = ["Scattered Lot", "Community Development", "Lot Development", "Lot Purchase"] as const;

export const FEE_DEFAULTS = {
  builder_fee: 15000,
  warranty: 5000,
  builders_risk: 1500,
  po_fee: 3000,
  pm_fee: 3500,
  utility: 1400,
  contingency_cap: 10000,
} as const;

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
