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
  // Opportunity
  "New Lead": { bg: "bg-blue-100", text: "text-blue-800" },
  Researching: { bg: "bg-sky-100", text: "text-sky-800" },
  Analyzing: { bg: "bg-indigo-100", text: "text-indigo-800" },
  "Due Diligence": { bg: "bg-violet-100", text: "text-violet-800" },
  "Under Contract": { bg: "bg-amber-100", text: "text-amber-800" },
  "Closed - Won": { bg: "bg-green-100", text: "text-green-800" },
  "Closed - Lost": { bg: "bg-red-100", text: "text-red-800" },
  "On Hold": { bg: "bg-gray-100", text: "text-gray-800" },

  // Project
  "Pre-Development": { bg: "bg-sky-100", text: "text-sky-800" },
  Entitlement: { bg: "bg-indigo-100", text: "text-indigo-800" },
  Horizontal: { bg: "bg-violet-100", text: "text-violet-800" },
  Vertical: { bg: "bg-amber-100", text: "text-amber-800" },
  Closeout: { bg: "bg-orange-100", text: "text-orange-800" },
  Completed: { bg: "bg-green-100", text: "text-green-800" },

  // Job
  "Pre-Construction": { bg: "bg-sky-100", text: "text-sky-800" },
  Permitting: { bg: "bg-indigo-100", text: "text-indigo-800" },
  Foundation: { bg: "bg-violet-100", text: "text-violet-800" },
  Framing: { bg: "bg-purple-100", text: "text-purple-800" },
  "Rough-Ins": { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
  "Insulation & Drywall": { bg: "bg-pink-100", text: "text-pink-800" },
  "Interior Finishes": { bg: "bg-rose-100", text: "text-rose-800" },
  Exterior: { bg: "bg-orange-100", text: "text-orange-800" },
  "Final Inspections": { bg: "bg-amber-100", text: "text-amber-800" },
  "CO Issued": { bg: "bg-green-100", text: "text-green-800" },
  Warranty: { bg: "bg-teal-100", text: "text-teal-800" },
  Closed: { bg: "bg-gray-100", text: "text-gray-700" },

  // Lot
  Future: { bg: "bg-gray-100", text: "text-gray-600" },
  Available: { bg: "bg-green-100", text: "text-green-800" },
  Reserved: { bg: "bg-amber-100", text: "text-amber-800" },
  Assigned: { bg: "bg-blue-100", text: "text-blue-800" },
  "Under Construction": { bg: "bg-violet-100", text: "text-violet-800" },
  Listed: { bg: "bg-cyan-100", text: "text-cyan-800" },

  // Disposition
  Lead: { bg: "bg-sky-100", text: "text-sky-800" },
  "Option Selections": { bg: "bg-indigo-100", text: "text-indigo-800" },
  "Builder Walk": { bg: "bg-violet-100", text: "text-violet-800" },
  "Closing Scheduled": { bg: "bg-amber-100", text: "text-amber-800" },
  Cancelled: { bg: "bg-red-100", text: "text-red-800" },

  // PO
  Draft: { bg: "bg-gray-100", text: "text-gray-700" },
  Submitted: { bg: "bg-blue-100", text: "text-blue-800" },
  Approved: { bg: "bg-green-100", text: "text-green-800" },
  "In Progress": { bg: "bg-amber-100", text: "text-amber-800" },
  Complete: { bg: "bg-teal-100", text: "text-teal-800" },
  Invoiced: { bg: "bg-indigo-100", text: "text-indigo-800" },
  Paid: { bg: "bg-emerald-100", text: "text-emerald-800" },
  Void: { bg: "bg-red-100", text: "text-red-800" },
};

export const NAV_MODULES = [
  { label: "Pipeline", path: "/pipeline", icon: "Target" },
  { label: "Projects", path: "/projects", icon: "FolderKanban" },
  { label: "Construction", path: "/construction", icon: "HardHat" },
  { label: "Disposition", path: "/disposition", icon: "Home" },
  { label: "Accounting", path: "/accounting", icon: "Calculator" },
  { label: "Contacts", path: "/contacts", icon: "Users" },
  { label: "Workflows", path: "/workflows", icon: "GitBranch" },
  { label: "Calendar", path: "/calendar", icon: "CalendarDays" },
  { label: "Tools", path: "/tools", icon: "Wrench", disabled: true },
  { label: "Admin", path: "/admin", icon: "Settings" },
] as const;
