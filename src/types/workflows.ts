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
}
