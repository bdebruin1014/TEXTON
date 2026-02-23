import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { FilterClickList, FilterSection, RightFilterPanel } from "@/components/layout/RightFilterPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

interface ContactAssignment {
  id: string;
  role: string | null;
  contact_id: string | null;
  contact: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    notes: string | null;
  } | null;
}

interface ContactDetailTabsProps {
  recordType: "project" | "opportunity";
  recordId: string;
}

const CONTACT_ROLES = [
  "Buyer",
  "Seller",
  "Lender",
  "Subcontractor",
  "Engineer",
  "Surveyor",
  "Listing Agent",
  "Attorney",
  "Title Agent",
  "Inspector",
  "Appraiser",
  "Other",
] as const;

const ROLE_CATEGORIES = [
  "Buyers",
  "Sellers",
  "Lenders",
  "Subcontractors",
  "Engineers",
  "Surveyors",
  "Listing Agents",
  "Other Contacts",
] as const;

const SUB_TABS = ["Info", "Addresses", "Notes"] as const;

/**
 * Qualia-style contact detail tabs for project/opportunity detail pages.
 *
 * Top: Person tabs showing each contact's name, with +/- buttons.
 * Below: Sub-tab bar (Info, Addresses, Notes).
 * Content: Auto-save form fields with ALL-CAPS labels.
 * Right panel: Role-based category list for filtering.
 */
export function ContactDetailTabs({ recordType, recordId }: ContactDetailTabsProps) {
  const queryClient = useQueryClient();
  const [activeContactIdx, setActiveContactIdx] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<(typeof SUB_TABS)[number]>("Info");
  const [activeRole, setActiveRole] = useState("All");

  const queryKey = useMemo(() => [`${recordType}-contacts-detail`, recordId], [recordType, recordId]);

  const { data: assignments = [], isLoading } = useQuery<ContactAssignment[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_assignments")
        .select("id, role, contact_id, contacts(id, name, email, phone, company, address, city, state, zip, notes)")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((ca: Record<string, unknown>) => ({
        id: ca.id as string,
        role: ca.role as string | null,
        contact_id: ca.contact_id as string | null,
        contact: ca.contacts as ContactAssignment["contact"],
      }));
    },
  });

  // Filter by role category
  const filtered = useMemo(() => {
    if (activeRole === "All") return assignments;
    // Map plural category to singular role prefix
    const roleMap: Record<string, string> = {
      Buyers: "Buyer",
      Sellers: "Seller",
      Lenders: "Lender",
      Subcontractors: "Subcontractor",
      Engineers: "Engineer",
      Surveyors: "Surveyor",
      "Listing Agents": "Listing Agent",
      "Other Contacts": "Other",
    };
    const rolePrefix = roleMap[activeRole];
    if (!rolePrefix) return assignments;
    return assignments.filter((a) => a.role?.startsWith(rolePrefix));
  }, [assignments, activeRole]);

  // Clamp active index
  const safeIdx = Math.min(activeContactIdx, Math.max(0, filtered.length - 1));
  const activeAssignment = filtered[safeIdx] ?? null;

  // Add contact mutation
  const addContact = useMutation({
    mutationFn: async () => {
      // Create a new contact and assignment
      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .insert({ name: "New Contact" })
        .select("id")
        .single();
      if (contactErr) throw contactErr;
      const { error: assignErr } = await supabase.from("contact_assignments").insert({
        record_type: recordType,
        record_id: recordId,
        contact_id: contact.id,
        role: "Other",
      });
      if (assignErr) throw assignErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Contact added");
      // Select the new contact (will be at end)
      setActiveContactIdx(filtered.length);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add contact"),
  });

  // Remove contact assignment mutation
  const removeContact = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("contact_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Contact removed");
      setActiveContactIdx(0);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to remove contact"),
  });

  // Auto-save handler for contact fields
  const saveContactField = useCallback(
    async (field: string, value: string) => {
      if (!activeAssignment?.contact?.id) return;
      const { error } = await supabase
        .from("contacts")
        .update({ [field]: value || null })
        .eq("id", activeAssignment.contact.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [activeAssignment?.contact?.id, queryClient, queryKey],
  );

  // Auto-save handler for assignment role
  const saveRole = useCallback(
    async (value: string) => {
      if (!activeAssignment?.id) return;
      const { error } = await supabase
        .from("contact_assignments")
        .update({ role: value || null })
        .eq("id", activeAssignment.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [activeAssignment?.id, queryClient, queryKey],
  );

  if (isLoading) return <FormSkeleton />;

  return (
    <>
      <div>
        {/* Contact person tabs */}
        <div className="mb-4 flex items-center gap-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
          {filtered.map((assignment, idx) => {
            const isActive = idx === safeIdx;
            return (
              <button
                key={assignment.id}
                type="button"
                onClick={() => setActiveContactIdx(idx)}
                className="relative px-3 py-2.5 text-[13px] font-medium transition-colors"
                style={{
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                }}
              >
                {assignment.contact?.name ?? "Unnamed"}
              </button>
            );
          })}

          {/* +/- buttons */}
          <div className="ml-auto flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => addContact.mutate()}
              className="flex h-7 w-7 items-center justify-center rounded text-sm font-medium transition-colors hover:bg-accent"
              style={{ color: "var(--color-primary)" }}
              title="Add contact"
            >
              +
            </button>
            {activeAssignment && (
              <button
                type="button"
                onClick={() => removeContact.mutate(activeAssignment.id)}
                className="flex h-7 w-7 items-center justify-center rounded text-sm font-medium transition-colors hover:bg-destructive-bg"
                style={{ color: "var(--color-destructive)" }}
                title="Remove contact"
              >
                {"\u2212"}
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {!activeAssignment ? (
          <EmptyState title="No contacts linked" description="Add a contact to this record to get started" />
        ) : (
          <>
            {/* Sub-tab bar */}
            <div className="mb-5 flex items-center gap-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {/* Role dropdown */}
              <div className="flex items-center gap-1.5 pb-2">
                <span className="text-[11px] text-muted">Role:</span>
                <select
                  value={activeAssignment.role ?? "Other"}
                  onChange={(e) => saveRole(e.target.value)}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
                >
                  {CONTACT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />

              {/* Sub-tabs */}
              {SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSubTab(tab)}
                    className="relative pb-2 text-[12px] font-medium transition-colors"
                    style={{
                      color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                      borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Form fields */}
            {activeSubTab === "Info" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AutoSaveField
                  label="FULL NAME"
                  value={activeAssignment.contact?.name}
                  onSave={(v) => saveContactField("name", v)}
                  placeholder="Enter name"
                />
                <AutoSaveField
                  label="EMAIL"
                  value={activeAssignment.contact?.email}
                  onSave={(v) => saveContactField("email", v)}
                  type="email"
                  placeholder="Enter email"
                />
                <AutoSaveField
                  label="PHONE"
                  value={activeAssignment.contact?.phone}
                  onSave={(v) => saveContactField("phone", v)}
                  type="tel"
                  placeholder="Enter phone"
                />
                <AutoSaveField
                  label="COMPANY"
                  value={activeAssignment.contact?.company}
                  onSave={(v) => saveContactField("company", v)}
                  placeholder="Enter company"
                />
              </div>
            )}

            {activeSubTab === "Addresses" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <AutoSaveField
                    label="STREET ADDRESS"
                    value={activeAssignment.contact?.address}
                    onSave={(v) => saveContactField("address", v)}
                    placeholder="Enter street address"
                  />
                </div>
                <AutoSaveField
                  label="CITY"
                  value={activeAssignment.contact?.city}
                  onSave={(v) => saveContactField("city", v)}
                  placeholder="Enter city"
                />
                <AutoSaveField
                  label="STATE"
                  value={activeAssignment.contact?.state}
                  onSave={(v) => saveContactField("state", v)}
                  placeholder="Enter state"
                />
                <AutoSaveField
                  label="ZIP CODE"
                  value={activeAssignment.contact?.zip}
                  onSave={(v) => saveContactField("zip", v)}
                  placeholder="Enter zip"
                />
              </div>
            )}

            {activeSubTab === "Notes" && (
              <div>
                <AutoSaveField
                  label="NOTES"
                  value={activeAssignment.contact?.notes}
                  onSave={(v) => saveContactField("notes", v)}
                  type="textarea"
                  placeholder="Add notes about this contact..."
                  rows={6}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Right panel — role categories */}
      <RightFilterPanel>
        <FilterSection label="Contact Roles">
          <FilterClickList options={["All", ...ROLE_CATEGORIES]} value={activeRole} onChange={setActiveRole} />
        </FilterSection>

        {/* Summary stats */}
        <FilterSection label="Summary">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--color-text-secondary)" }}>Total Contacts</span>
              <span className="font-medium text-foreground">{assignments.length}</span>
            </div>
            {ROLE_CATEGORIES.map((cat) => {
              const roleMap: Record<string, string> = {
                Buyers: "Buyer",
                Sellers: "Seller",
                Lenders: "Lender",
                Subcontractors: "Subcontractor",
                Engineers: "Engineer",
                Surveyors: "Surveyor",
                "Listing Agents": "Listing Agent",
                "Other Contacts": "Other",
              };
              const count = assignments.filter((a) => a.role?.startsWith(roleMap[cat] ?? "")).length;
              if (count === 0) return null;
              return (
                <div key={cat} className="flex items-center justify-between text-[11px]">
                  <span style={{ color: "var(--color-text-secondary)" }}>{cat}</span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </FilterSection>
      </RightFilterPanel>
    </>
  );
}
