// ── Matter Module Types ──────────────────────────────────────────────────

export type MatterStatus = "open" | "in_progress" | "on_hold" | "resolved" | "closed" | "cancelled";
export type MatterPriority = "critical" | "high" | "medium" | "low";
export type MatterCategory =
  | "contract_dispute"
  | "refinance"
  | "insurance_claim"
  | "legal"
  | "compliance"
  | "zoning"
  | "permitting"
  | "partnership"
  | "vendor_dispute"
  | "title_issue"
  | "environmental"
  | "tax"
  | "investor_relations"
  | "construction_defect"
  | "other";

export type WorkflowStepType = "milestone" | "task" | "deliverable" | "decision_point" | "review";
export type WorkflowStepStatus = "pending" | "in_progress" | "completed" | "skipped" | "blocked";
export type MatterNoteType = "comment" | "status_change" | "assignment" | "system" | "email_log";
export type MatterDocumentType = "contract" | "correspondence" | "legal_filing" | "financial" | "photo" | "other";

export interface Matter {
  id: string;
  matter_number: string;
  title: string;
  status: MatterStatus;
  priority: MatterPriority;
  category: MatterCategory;
  situation_summary: string | null;
  relevant_information: string | null;
  goals_and_deliverables: string | null;
  target_completion_date: string | null;
  intake_conversation: unknown[];
  ai_generated_workflow: unknown | null;
  linked_project_id: string | null;
  linked_opportunity_id: string | null;
  linked_entity_id: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface MatterContact {
  id: string;
  matter_id: string;
  contact_id: string;
  role: string;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  // Joined fields
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
}

export interface MatterWorkflowStep {
  id: string;
  matter_id: string;
  parent_step_id: string | null;
  step_order: number;
  step_type: WorkflowStepType;
  title: string;
  description: string | null;
  status: WorkflowStepStatus;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  depends_on: string[] | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatterDocument {
  id: string;
  matter_id: string;
  file_name: string;
  file_url: string | null;
  storage_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  document_type: MatterDocumentType;
  uploaded_by: string | null;
  created_at: string;
}

export interface MatterNote {
  id: string;
  matter_id: string;
  note_type: MatterNoteType;
  content: string | null;
  previous_value: string | null;
  new_value: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  author_name?: string;
}

export interface MatterLinkedRecord {
  id: string;
  matter_id: string;
  record_type: "project" | "opportunity" | "entity" | "contact" | "matter";
  record_id: string;
  relationship_description: string | null;
  created_at: string;
  // Joined
  record_name?: string;
}

/** Payload for creating a matter via the Edge Function */
export interface CreateMatterPayload {
  userId: string;
  situationText: string;
  relevantInfoText: string;
  goalsText: string;
  linkedRecords: Array<{ record_type: string; record_id: string; label: string }>;
  uploadedFiles: Array<{ file_name: string; storage_path: string; file_size: number; mime_type: string }>;
}

/** Response from the generate-matter Edge Function */
export interface GenerateMatterResponse {
  success: boolean;
  matter_id: string;
  matter_number: string;
}
