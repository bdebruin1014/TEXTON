import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { AddContactModal } from "@/components/matters/AddContactModal";
import { AddStepForm } from "@/components/matters/AddStepForm";
import { LinkRecordModal } from "@/components/matters/LinkRecordModal";
import { WorkflowStepCard } from "@/components/matters/WorkflowStepCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MATTER_CATEGORIES, MATTER_CATEGORY_LABELS, MATTER_STATUS_LABELS, MATTER_STATUSES } from "@/lib/constants";
import {
  addLinkedRecord,
  addMatterContact,
  addMatterNote,
  addWorkflowStep,
  deleteMatterDocument,
  getMatter,
  getMatterContacts,
  getMatterDocuments,
  getMatterLinkedRecords,
  getMatterNotes,
  getWorkflowSteps,
  removeLinkedRecord,
  removeMatterContact,
  updateMatter,
  updateWorkflowStep,
  uploadMatterDocument,
} from "@/lib/queries/matters";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type {
  Matter,
  MatterContact,
  MatterDocument,
  MatterDocumentType,
  MatterLinkedRecord,
  MatterNote,
  MatterWorkflowStep,
} from "@/types/matters";

export const Route = createFileRoute("/_authenticated/operations/matters/$matterId")({
  component: MatterDetail,
});

// ── Section types ───────────────────────────────────────────────────────

type ActiveSection = "basic-info" | "situation" | "parties" | "steps" | "documents" | "linked-records" | "notes";

// ── Priority labels ─────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "---";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysBetween(from: string, to?: string): number {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const DOCUMENT_TYPES: { value: MatterDocumentType; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "correspondence", label: "Correspondence" },
  { value: "legal_filing", label: "Legal Filing" },
  { value: "financial", label: "Financial" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

// ── Main Component ──────────────────────────────────────────────────────

function MatterDetail() {
  const { matterId } = Route.useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const [activeSection, setActiveSection] = useState<ActiveSection>("basic-info");

  // ── Queries ─────────────────────────────────────────────────────────

  const { data: matter, isLoading } = useQuery<Matter>({
    queryKey: ["matter", matterId],
    queryFn: () => getMatter(matterId),
  });

  const { data: steps = [] } = useQuery<MatterWorkflowStep[]>({
    queryKey: ["matter-steps", matterId],
    queryFn: () => getWorkflowSteps(matterId),
  });

  const { data: contacts = [] } = useQuery<MatterContact[]>({
    queryKey: ["matter-contacts", matterId],
    queryFn: () => getMatterContacts(matterId),
  });

  const { data: documents = [] } = useQuery<MatterDocument[]>({
    queryKey: ["matter-documents", matterId],
    queryFn: () => getMatterDocuments(matterId),
  });

  const { data: notes = [] } = useQuery<MatterNote[]>({
    queryKey: ["matter-notes", matterId],
    queryFn: () => getMatterNotes(matterId),
  });

  const { data: linkedRecords = [] } = useQuery<MatterLinkedRecord[]>({
    queryKey: ["matter-linked-records", matterId],
    queryFn: () => getMatterLinkedRecords(matterId),
  });

  // ── Mutations ───────────────────────────────────────────────────────

  const updateMatterMutation = useMutation({
    mutationFn: (updates: Partial<Matter>) => updateMatter(matterId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter", matterId] });
      queryClient.invalidateQueries({ queryKey: ["matters"] });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MatterWorkflowStep> }) =>
      updateWorkflowStep(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-steps", matterId] });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: (step: Omit<MatterWorkflowStep, "id" | "created_at" | "updated_at">) => addWorkflowStep(step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-steps", matterId] });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: ({ contactId, role, isPrimary }: { contactId: string; role: string; isPrimary: boolean }) =>
      addMatterContact(matterId, contactId, role, isPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-contacts", matterId] });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: (id: string) => removeMatterContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-contacts", matterId] });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) =>
      uploadMatterDocument(matterId, file, documentType, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-documents", matterId] });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string | null }) =>
      deleteMatterDocument(id, storagePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-documents", matterId] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({
      noteType,
      content,
      previousValue,
      newValue,
    }: {
      noteType: string;
      content: string;
      previousValue?: string;
      newValue?: string;
    }) => addMatterNote(matterId, noteType, content, userId, previousValue, newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-notes", matterId] });
    },
  });

  const addLinkedRecordMutation = useMutation({
    mutationFn: ({
      recordType,
      recordId,
      description,
    }: {
      recordType: string;
      recordId: string;
      description?: string;
    }) => addLinkedRecord(matterId, recordType, recordId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-linked-records", matterId] });
    },
  });

  const removeLinkedRecordMutation = useMutation({
    mutationFn: (id: string) => removeLinkedRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter-linked-records", matterId] });
    },
  });

  // ── Save handlers ─────────────────────────────────────────────────

  const saveMatterField = useCallback(
    (field: keyof Matter) => async (value: string) => {
      const updates = { [field]: value || null } as Partial<Matter>;

      // Log status changes
      if (field === "status" && matter) {
        const oldLabel = MATTER_STATUS_LABELS[matter.status] ?? matter.status;
        const newLabel = MATTER_STATUS_LABELS[value] ?? value;
        addNoteMutation.mutate({
          noteType: "status_change",
          content: `Status changed from ${oldLabel} to ${newLabel}`,
          previousValue: matter.status,
          newValue: value,
        });
      }

      await updateMatterMutation.mutateAsync(updates);
    },
    [matter, updateMatterMutation, addNoteMutation],
  );

  const handleStepUpdate = useCallback(
    (id: string, updates: Partial<MatterWorkflowStep>) => {
      updateStepMutation.mutate({ id, updates });
    },
    [updateStepMutation],
  );

  // ── Computed values ───────────────────────────────────────────────

  const completedSteps = useMemo(() => steps.filter((s) => s.status === "completed").length, [steps]);

  const daysOpen = useMemo(() => {
    if (!matter) return 0;
    return daysBetween(matter.created_at);
  }, [matter]);

  const daysToDeadline = useMemo(() => {
    if (!matter?.target_completion_date) return null;
    const days = daysBetween(new Date().toISOString(), matter.target_completion_date);
    return days;
  }, [matter]);

  // ── Loading / Not Found ───────────────────────────────────────────

  if (isLoading) {
    return <FormSkeleton fields={8} />;
  }

  if (!matter) {
    return <EmptyState title="Matter not found" description="This matter may have been removed." />;
  }

  // ── Sidebar ───────────────────────────────────────────────────────

  const sidebarSections: SidebarSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Basic Info", path: `/operations/matters/${matterId}#basic-info` },
        { label: "Situation", path: `/operations/matters/${matterId}#situation` },
        { label: "Parties", path: `/operations/matters/${matterId}#parties`, badge: contacts.length },
      ],
    },
    {
      label: "Workflow",
      items: [
        {
          label: "Steps & Milestones",
          path: `/operations/matters/${matterId}#steps`,
          badge: `${completedSteps}/${steps.length}`,
        },
      ],
    },
    {
      label: "Records",
      items: [
        { label: "Documents", path: `/operations/matters/${matterId}#documents`, badge: documents.length },
        {
          label: "Linked Records",
          path: `/operations/matters/${matterId}#linked-records`,
          badge: linkedRecords.length,
        },
      ],
    },
    {
      label: "Activity",
      items: [{ label: "Notes & History", path: `/operations/matters/${matterId}#notes`, badge: notes.length }],
    },
  ];

  const sidebar = (
    <DetailSidebar
      backLabel="All Matters"
      backPath="/operations/matters"
      title={matter.title}
      subtitle={matter.matter_number}
      status={MATTER_STATUS_LABELS[matter.status]}
      stats={[
        { label: "Steps", value: `${completedSteps}/${steps.length}` },
        { label: "Days Open", value: daysOpen },
        { label: "Contacts", value: contacts.length },
      ]}
      sections={sidebarSections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          // Override path to trigger section change via onClick below
          path: `/operations/matters/${matterId}`,
        })),
      }))}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        {/* Breadcrumb + header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Operations</span>
            <span>/</span>
            <span>Matters</span>
            <span>/</span>
            <span className="text-foreground font-medium">{matter.matter_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{matter.title}</h1>
            <StatusBadge status={matter.status} />
            <StatusBadge status={matter.priority} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {MATTER_CATEGORY_LABELS[matter.category] ?? matter.category} -- Created {formatDate(matter.created_at)}
          </p>
        </div>

        {/* Section tabs */}
        <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
          {(
            [
              { key: "basic-info", label: "Basic Info" },
              { key: "situation", label: "Situation" },
              { key: "parties", label: "Parties" },
              { key: "steps", label: "Workflow" },
              { key: "documents", label: "Documents" },
              { key: "linked-records", label: "Linked Records" },
              { key: "notes", label: "Notes" },
            ] as { key: ActiveSection; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeSection === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        {activeSection === "basic-info" && (
          <BasicInfoSection
            matter={matter}
            steps={steps}
            completedSteps={completedSteps}
            daysOpen={daysOpen}
            daysToDeadline={daysToDeadline}
            onSave={saveMatterField}
          />
        )}
        {activeSection === "situation" && <SituationSection matter={matter} onSave={saveMatterField} />}
        {activeSection === "parties" && (
          <PartiesSection
            contacts={contacts}
            onAddContact={(contactId, role, isPrimary) => addContactMutation.mutate({ contactId, role, isPrimary })}
            onRemoveContact={(id) => removeContactMutation.mutate(id)}
            isAddPending={addContactMutation.isPending}
          />
        )}
        {activeSection === "steps" && (
          <StepsSection
            steps={steps}
            completedSteps={completedSteps}
            onUpdateStep={handleStepUpdate}
            onAddStep={(step) =>
              addStepMutation.mutate({
                matter_id: matterId,
                parent_step_id: null,
                step_order: steps.length + 1,
                step_type: step.step_type,
                title: step.title,
                description: step.description,
                status: "pending",
                assigned_to: null,
                due_date: step.due_date,
                completed_at: null,
                depends_on: null,
                ai_generated: false,
              })
            }
            isAddPending={addStepMutation.isPending}
          />
        )}
        {activeSection === "documents" && (
          <DocumentsSection
            documents={documents}
            onUpload={(file, documentType) => uploadDocMutation.mutate({ file, documentType })}
            onDelete={(id, storagePath) => deleteDocMutation.mutate({ id, storagePath })}
            isUploading={uploadDocMutation.isPending}
          />
        )}
        {activeSection === "linked-records" && (
          <LinkedRecordsSection
            matter={matter}
            linkedRecords={linkedRecords}
            onLink={(recordType, recordId, description) =>
              addLinkedRecordMutation.mutate({ recordType, recordId, description })
            }
            onRemove={(id) => removeLinkedRecordMutation.mutate(id)}
            isLinkPending={addLinkedRecordMutation.isPending}
          />
        )}
        {activeSection === "notes" && (
          <NotesSection
            notes={notes}
            onAddNote={(content) => addNoteMutation.mutate({ noteType: "comment", content })}
            isAddPending={addNoteMutation.isPending}
          />
        )}
      </div>
    </PageWithSidebar>
  );
}

// ── Basic Info Section ────────────────────────────────────────────────

function BasicInfoSection({
  matter,
  steps,
  completedSteps,
  daysOpen,
  daysToDeadline,
  onSave,
}: {
  matter: Matter;
  steps: MatterWorkflowStep[];
  completedSteps: number;
  daysOpen: number;
  daysToDeadline: number | null;
  onSave: (field: keyof Matter) => (value: string) => Promise<void>;
}) {
  const progressPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Workflow Progress</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {completedSteps}/{steps.length}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-accent">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{progressPct}% complete</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Days Open</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{daysOpen}</div>
          <div className="mt-1 text-xs text-muted-foreground">Since {formatDate(matter.created_at)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Days to Deadline</div>
          <div
            className={`mt-1 text-2xl font-semibold ${
              daysToDeadline !== null && daysToDeadline < 0 ? "text-red-600" : "text-foreground"
            }`}
          >
            {daysToDeadline !== null
              ? daysToDeadline < 0
                ? `${Math.abs(daysToDeadline)} overdue`
                : daysToDeadline
              : "---"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {matter.target_completion_date
              ? `Target: ${formatDate(matter.target_completion_date)}`
              : "No target date set"}
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <AutoSaveField label="Title" value={matter.title} onSave={onSave("title")} required />
          <AutoSaveSelect
            label="Status"
            value={matter.status}
            options={MATTER_STATUSES.map((s) => ({ label: MATTER_STATUS_LABELS[s] ?? s, value: s }))}
            onSave={onSave("status")}
            required
          />
          <AutoSaveSelect
            label="Priority"
            value={matter.priority}
            options={PRIORITY_OPTIONS}
            onSave={onSave("priority")}
            required
          />
          <AutoSaveSelect
            label="Category"
            value={matter.category}
            options={MATTER_CATEGORIES.map((c) => ({ label: MATTER_CATEGORY_LABELS[c] ?? c, value: c }))}
            onSave={onSave("category")}
            required
          />
          <AutoSaveField label="Assigned To" value={matter.assigned_to} onSave={onSave("assigned_to")} />
          <AutoSaveField
            label="Target Completion Date"
            value={matter.target_completion_date}
            onSave={onSave("target_completion_date")}
            type="date"
          />
        </div>
      </div>
    </div>
  );
}

// ── Situation Section ─────────────────────────────────────────────────

function SituationSection({
  matter,
  onSave,
}: {
  matter: Matter;
  onSave: (field: keyof Matter) => (value: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Situation Details</h2>
        <div className="space-y-1">
          <AutoSaveField
            label="Situation Summary"
            value={matter.situation_summary}
            onSave={onSave("situation_summary")}
            type="textarea"
            rows={5}
            placeholder="Describe the situation or issue..."
          />
          <AutoSaveField
            label="Relevant Information"
            value={matter.relevant_information}
            onSave={onSave("relevant_information")}
            type="textarea"
            rows={5}
            placeholder="Key facts, dates, amounts, parties involved..."
          />
          <AutoSaveField
            label="Goals & Deliverables"
            value={matter.goals_and_deliverables}
            onSave={onSave("goals_and_deliverables")}
            type="textarea"
            rows={5}
            placeholder="What outcomes are you seeking?"
          />
        </div>
      </div>
    </div>
  );
}

// ── Parties Section ───────────────────────────────────────────────────

function PartiesSection({
  contacts,
  onAddContact,
  onRemoveContact,
  isAddPending,
}: {
  contacts: MatterContact[];
  onAddContact: (contactId: string, role: string, isPrimary: boolean) => void;
  onRemoveContact: (id: string) => void;
  isAddPending: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Parties ({contacts.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts added"
          description="Add contacts related to this matter such as attorneys, brokers, or consultants."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Primary
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{c.contact_name || "---"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company_name || "---"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_email || "---"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_phone || "---"}</td>
                  <td className="px-4 py-3">
                    {c.is_primary ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Primary
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">---</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveContact(c.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddContactModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={(contactId, role, isPrimary) => {
          onAddContact(contactId, role, isPrimary);
          setShowModal(false);
        }}
        isPending={isAddPending}
      />
    </div>
  );
}

// ── Steps Section ─────────────────────────────────────────────────────

function StepsSection({
  steps,
  completedSteps,
  onUpdateStep,
  onAddStep,
  isAddPending,
}: {
  steps: MatterWorkflowStep[];
  completedSteps: number;
  onUpdateStep: (id: string, updates: Partial<MatterWorkflowStep>) => void;
  onAddStep: (step: {
    title: string;
    step_type: MatterWorkflowStep["step_type"];
    description: string | null;
    due_date: string | null;
  }) => void;
  isAddPending: boolean;
}) {
  const progressPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">
            Workflow Progress: {completedSteps} of {steps.length} steps complete
          </h2>
          <span className="text-sm font-medium text-muted-foreground">{progressPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-accent">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Step cards */}
      {steps.length === 0 ? (
        <EmptyState title="No workflow steps" description="Add steps to track the workflow for this matter." />
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <WorkflowStepCard key={step.id} step={step} stepIndex={idx} onUpdate={onUpdateStep} allSteps={steps} />
          ))}
        </div>
      )}

      {/* Add step form */}
      <AddStepForm onAdd={onAddStep} isPending={isAddPending} />
    </div>
  );
}

// ── Documents Section ─────────────────────────────────────────────────

function DocumentsSection({
  documents,
  onUpload,
  onDelete,
  isUploading,
}: {
  documents: MatterDocument[];
  onUpload: (file: File, documentType: string) => void;
  onDelete: (id: string, storagePath: string | null) => void;
  isUploading: boolean;
}) {
  const [docType, setDocType] = useState<MatterDocumentType>("other");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        onUpload(file, docType);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as MatterDocumentType)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Select document type before uploading</span>
        </div>

        <div
          role="presentation"
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <p className="text-sm text-muted-foreground">Drag files here or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Browse Files"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Document table */}
      {documents.length === 0 ? (
        <EmptyState title="No documents" description="Upload documents related to this matter." />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  File Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {doc.file_name}
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">{doc.file_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {doc.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatFileSize(doc.file_size)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id, doc.storage_path)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Linked Records Section ────────────────────────────────────────────

const RECORD_TYPE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-700",
  opportunity: "bg-amber-100 text-amber-700",
  contact: "bg-green-100 text-green-700",
  entity: "bg-purple-100 text-purple-700",
  matter: "bg-indigo-100 text-indigo-700",
};

function LinkedRecordsSection({
  matter,
  linkedRecords,
  onLink,
  onRemove,
  isLinkPending,
}: {
  matter: Matter;
  linkedRecords: MatterLinkedRecord[];
  onLink: (recordType: string, recordId: string, description: string) => void;
  onRemove: (id: string) => void;
  isLinkPending: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  // Primary links from the matter record itself
  const primaryLinks = [
    matter.linked_project_id ? { type: "project", id: matter.linked_project_id } : null,
    matter.linked_opportunity_id ? { type: "opportunity", id: matter.linked_opportunity_id } : null,
    matter.linked_entity_id ? { type: "entity", id: matter.linked_entity_id } : null,
  ].filter(Boolean) as { type: string; id: string }[];

  return (
    <div className="space-y-4">
      {/* Primary linked records */}
      {primaryLinks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Primary Links</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {primaryLinks.map((link) => (
              <div key={`${link.type}-${link.id}`} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${RECORD_TYPE_COLORS[link.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {link.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{link.id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional linked records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Additional Linked Records ({linkedRecords.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Link Record
          </button>
        </div>

        {linkedRecords.length === 0 ? (
          <EmptyState title="No linked records" description="Link related projects, contacts, or other records." />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Record
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Linked
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {linkedRecords.map((lr) => (
                  <tr key={lr.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${RECORD_TYPE_COLORS[lr.record_type] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {lr.record_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{lr.record_name ?? lr.record_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lr.relationship_description || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(lr.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(lr.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LinkRecordModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onLink={(recordType, recordId, description) => {
          onLink(recordType, recordId, description);
          setShowModal(false);
        }}
        isPending={isLinkPending}
      />
    </div>
  );
}

// ── Notes Section ─────────────────────────────────────────────────────

function NotesSection({
  notes,
  onAddNote,
  isAddPending,
}: {
  notes: MatterNote[];
  onAddNote: (content: string) => void;
  isAddPending: boolean;
}) {
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddNote(newComment.trim());
    setNewComment("");
  };

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label htmlFor="matter-new-comment" className="mb-2 block text-sm font-medium text-foreground">
          Add Comment
        </label>
        <div className="flex gap-2">
          <textarea
            id="matter-new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleAddComment();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddComment}
            disabled={!newComment.trim() || isAddPending}
            className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAddPending ? "Posting..." : "Post"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Press Ctrl+Enter to post</p>
      </div>

      {/* Notes feed */}
      {notes.length === 0 ? (
        <EmptyState title="No activity yet" description="Comments and status changes will appear here." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteItem({ note }: { note: MatterNote }) {
  const timestamp = formatDate(note.created_at);
  const author = note.author_name || note.created_by || "System";

  if (note.note_type === "status_change") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">[status]</span>
        <span className="flex-1 text-sm text-foreground">{note.content}</span>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
    );
  }

  if (note.note_type === "assignment") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">[assigned]</span>
        <span className="flex-1 text-sm text-foreground">{note.content}</span>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
    );
  }

  if (note.note_type === "system" || note.note_type === "email_log") {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">[{note.note_type}]</span>
        <span className="flex-1 text-sm italic text-muted-foreground">{note.content}</span>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
    );
  }

  // comment
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{author}</span>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
    </div>
  );
}
