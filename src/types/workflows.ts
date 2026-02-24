export interface WorkflowInstance {
  id: string;
  template_id: string | null;
  entity_id: string | null;
  record_type: string;
  record_id: string;
  name: string;
  status: "active" | "paused" | "completed" | "cancelled";
  chat_conversation: ChatMessage[];
  ai_customization: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  template?: { id: string; name: string } | null;
  milestones?: InstanceMilestone[];
}

export interface InstanceMilestone {
  id: string;
  instance_id: string;
  name: string;
  sort_order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  created_at: string;
  updated_at: string;
  tasks?: InstanceTask[];
}

export interface InstanceTask {
  id: string;
  instance_id: string;
  milestone_id: string | null;
  task_name: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped" | "blocked";
  assigned_to_user: string | null;
  assigned_to_team: string | null;
  assigned_role: string | null;
  due_date: string | null;
  completed_at: string | null;
  depends_on: string[];
  sort_order: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  team?: { id: string; name: string; color: string | null } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  status: string;
  entity_id: string | null;
  // Engine columns (from 20260225_workflow_engine migration)
  project_type?: ProjectType | null;
  trigger_event?: string | null;
  trigger_table?: string | null;
  trigger_column?: string | null;
  trigger_value?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  task_count?: number;
}

export type ProjectType = "scattered_lot" | "community_development" | "lot_purchase" | "lot_development" | "all";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  scattered_lot: "Scattered Lot",
  community_development: "Community Development",
  lot_purchase: "Lot Purchase",
  lot_development: "Lot Development",
  all: "All Types",
};

export const TRIGGER_TABLES = [
  { value: "opportunities", label: "Opportunities" },
  { value: "projects", label: "Projects" },
  { value: "jobs", label: "Jobs" },
  { value: "dispositions", label: "Dispositions" },
] as const;

export const ASSIGNED_ROLES = [
  { value: "pm", label: "Project Manager" },
  { value: "acq_mgr", label: "Acquisition Manager" },
  { value: "director", label: "Director" },
  { value: "principal", label: "Principal" },
  { value: "closing_coordinator", label: "Closing Coordinator" },
  { value: "controller", label: "Controller" },
  { value: "sales", label: "Sales" },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(ASSIGNED_ROLES.map((r) => [r.value, r.label]));

export interface WorkflowTemplateTask {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  phase: string | null;
  assigned_role: string;
  due_days: number;
  due_reference: string;
  is_gate: boolean;
  gate_condition: string | null;
  depends_on: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskInstance {
  id: string;
  workflow_instance_id: string;
  template_task_id: string | null;
  name: string;
  description: string | null;
  phase: string | null;
  status: "pending" | "blocked" | "active" | "completed" | "skipped";
  assigned_to: string | null;
  assigned_role: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  is_gate: boolean;
  is_overdue: boolean;
  notes: string | null;
  record_type: string;
  record_id: string;
  project_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
