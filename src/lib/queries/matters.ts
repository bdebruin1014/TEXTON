import { supabase } from "@/lib/supabase";
import type {
  Matter,
  MatterContact,
  MatterDocument,
  MatterLinkedRecord,
  MatterNote,
  MatterWorkflowStep,
} from "@/types/matters";

// ── List / Single ────────────────────────────────────────────────────────

export async function getMatters(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
}): Promise<Matter[]> {
  let query = supabase.from("matters").select("*").order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,matter_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Matter[];
}

export async function getMatter(id: string): Promise<Matter> {
  const { data, error } = await supabase.from("matters").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Matter;
}

export async function updateMatter(id: string, updates: Partial<Matter>): Promise<void> {
  const { error } = await supabase.from("matters").update(updates).eq("id", id);
  if (error) throw error;
}

// ── Workflow Steps ───────────────────────────────────────────────────────

export async function getWorkflowSteps(matterId: string): Promise<MatterWorkflowStep[]> {
  const { data, error } = await supabase
    .from("matter_workflow_steps")
    .select("*")
    .eq("matter_id", matterId)
    .order("step_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MatterWorkflowStep[];
}

export async function updateWorkflowStep(id: string, updates: Partial<MatterWorkflowStep>): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.status === "completed" && !updates.completed_at) {
    payload.completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("matter_workflow_steps").update(payload).eq("id", id);
  if (error) throw error;
}

export async function addWorkflowStep(
  step: Omit<MatterWorkflowStep, "id" | "created_at" | "updated_at">,
): Promise<MatterWorkflowStep> {
  const { data, error } = await supabase.from("matter_workflow_steps").insert(step).select().single();
  if (error) throw error;
  return data as MatterWorkflowStep;
}

// ── Contacts ─────────────────────────────────────────────────────────────

export async function getMatterContacts(matterId: string): Promise<MatterContact[]> {
  const { data, error } = await supabase
    .from("matter_contacts")
    .select("*, contacts(first_name, last_name, email, phone, company_id, companies(name))")
    .eq("matter_id", matterId);
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const contact = r.contacts as Record<string, unknown> | null;
    const company = contact?.companies as Record<string, unknown> | null;
    return {
      ...r,
      contact_name: contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() : "",
      contact_email: (contact?.email as string) ?? "",
      contact_phone: (contact?.phone as string) ?? "",
      company_name: (company?.name as string) ?? "",
    } as MatterContact;
  });
}

export async function addMatterContact(
  matterId: string,
  contactId: string,
  role: string,
  isPrimary = false,
): Promise<void> {
  const { error } = await supabase
    .from("matter_contacts")
    .insert({ matter_id: matterId, contact_id: contactId, role, is_primary: isPrimary });
  if (error) throw error;
}

export async function removeMatterContact(id: string): Promise<void> {
  const { error } = await supabase.from("matter_contacts").delete().eq("id", id);
  if (error) throw error;
}

// ── Documents ────────────────────────────────────────────────────────────

export async function getMatterDocuments(matterId: string): Promise<MatterDocument[]> {
  const { data, error } = await supabase
    .from("matter_documents")
    .select("*")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MatterDocument[];
}

export async function uploadMatterDocument(
  matterId: string,
  file: File,
  documentType: string,
  userId: string,
): Promise<MatterDocument> {
  const path = `${matterId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("matter-documents").upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("matter-documents").getPublicUrl(path);

  const { data, error } = await supabase
    .from("matter_documents")
    .insert({
      matter_id: matterId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MatterDocument;
}

export async function deleteMatterDocument(id: string, storagePath: string | null): Promise<void> {
  if (storagePath) {
    await supabase.storage.from("matter-documents").remove([storagePath]);
  }
  const { error } = await supabase.from("matter_documents").delete().eq("id", id);
  if (error) throw error;
}

// ── Notes ────────────────────────────────────────────────────────────────

export async function getMatterNotes(matterId: string): Promise<MatterNote[]> {
  const { data, error } = await supabase
    .from("matter_notes")
    .select("*")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MatterNote[];
}

export async function addMatterNote(
  matterId: string,
  noteType: string,
  content: string,
  createdBy: string,
  previousValue?: string,
  newValue?: string,
): Promise<void> {
  const { error } = await supabase.from("matter_notes").insert({
    matter_id: matterId,
    note_type: noteType,
    content,
    created_by: createdBy,
    previous_value: previousValue ?? null,
    new_value: newValue ?? null,
  });
  if (error) throw error;
}

// ── Linked Records ───────────────────────────────────────────────────────

export async function getMatterLinkedRecords(matterId: string): Promise<MatterLinkedRecord[]> {
  const { data, error } = await supabase
    .from("matter_linked_records")
    .select("*")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MatterLinkedRecord[];
}

export async function addLinkedRecord(
  matterId: string,
  recordType: string,
  recordId: string,
  description?: string,
): Promise<void> {
  const { error } = await supabase.from("matter_linked_records").insert({
    matter_id: matterId,
    record_type: recordType,
    record_id: recordId,
    relationship_description: description ?? null,
  });
  if (error) throw error;
}

export async function removeLinkedRecord(id: string): Promise<void> {
  const { error } = await supabase.from("matter_linked_records").delete().eq("id", id);
  if (error) throw error;
}
