import { useState } from "react";
import type { DocumentFolder } from "@/hooks/useDocumentFolders";
import { useCreateUploadRequest } from "@/hooks/useUploadRequests";
import { ContactSearchInput } from "./ContactSearchInput";

interface UploadRequestDialogProps {
  open: boolean;
  onClose: () => void;
  recordType: string;
  recordId: string;
  folders: DocumentFolder[];
}

interface RequestItem {
  name: string;
  description: string;
  is_required: boolean;
  accepted_extensions: string;
  max_file_size: string;
  destination_folder_id: string;
  auto_tag: string;
}

const DEFAULT_ITEM: RequestItem = {
  name: "",
  description: "",
  is_required: true,
  accepted_extensions: "",
  max_file_size: "25",
  destination_folder_id: "",
  auto_tag: "",
};

export function UploadRequestDialog({ open, onClose, recordType, recordId, folders }: UploadRequestDialogProps) {
  const createRequest = useCreateUploadRequest();

  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
    email: string;
    company_name: string | null;
  } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContactId, setRecipientContactId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [items, setItems] = useState<RequestItem[]>([{ ...DEFAULT_ITEM }]);

  if (!open) return null;

  const addItem = () => setItems([...items, { ...DEFAULT_ITEM }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof RequestItem, value: string | boolean) => {
    const updated = [...items];
    const item = updated[index]!;
    (item as unknown as Record<string, string | boolean>)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async () => {
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    await createRequest.mutateAsync({
      record_type: recordType,
      record_id: recordId,
      destination_folder_id: destinationFolderId || null,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_company: recipientCompany || undefined,
      recipient_contact_id: recipientContactId,
      subject,
      message: message || undefined,
      due_date: dueDate || null,
      expires_at: expiresAt,
      notify_on_upload: notifyOnUpload,
      notify_on_complete: notifyOnComplete,
      items: items
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name,
          description: item.description || undefined,
          is_required: item.is_required,
          accepted_extensions: item.accepted_extensions
            ? item.accepted_extensions.split(",").map((e) => e.trim())
            : undefined,
          max_file_size: item.max_file_size ? Number(item.max_file_size) * 1048576 : undefined,
          destination_folder_id: item.destination_folder_id || undefined,
          auto_tag: item.auto_tag || undefined,
        })),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Request Documents</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Recipient */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient</label>
            <div className="mt-1">
              <ContactSearchInput
                selectedContact={selectedContact}
                onSelect={(c) => {
                  setSelectedContact(c);
                  setRecipientName(c.name);
                  setRecipientEmail(c.email);
                  setRecipientCompany(c.company_name ?? "");
                  setRecipientContactId(c.id);
                }}
                onClear={() => {
                  setSelectedContact(null);
                  setRecipientName("");
                  setRecipientEmail("");
                  setRecipientCompany("");
                  setRecipientContactId(null);
                }}
              />
            </div>
            {!selectedContact && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Name *"
                  className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
                />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Email *"
                  className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
                />
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Documents Needed for..."
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
            />
          </div>

          {/* Due date & destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Destination Folder
              </label>
              <select
                value={destinationFolderId}
                onChange={(e) => setDestinationFolderId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
              >
                <option value="">Root (no folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Requested items */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Requested Documents
            </label>
            <div className="mt-2 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      placeholder="Document name *"
                      className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#143A23]/20"
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.is_required}
                        onChange={(e) => updateItem(index, "is_required", e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      Required
                    </label>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <span className="text-xs">Remove</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full rounded-md border border-border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#143A23]/20"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-sm font-medium text-[#143A23] hover:underline"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span>Link expires:</span>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="rounded-md border border-border px-2 py-1 text-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyOnUpload}
                  onChange={(e) => setNotifyOnUpload(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Notify me when files are uploaded
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyOnComplete}
                  onChange={(e) => setNotifyOnComplete(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Notify me when all required items are complete
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!recipientEmail || !subject || !items.some((i) => i.name.trim()) || createRequest.isPending}
            className="rounded-md bg-[#143A23] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143A23]/90 disabled:opacity-50"
          >
            {createRequest.isPending ? "Sending..." : "Send Upload Request →"}
          </button>
        </div>
      </div>
    </div>
  );
}
