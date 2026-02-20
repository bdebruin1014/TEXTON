import { Copy, Link, X } from "lucide-react";
import { useState } from "react";
import type { DocumentRecord } from "@/hooks/useDocuments";
import { getShareUrl, useCreateShare } from "@/hooks/useDocumentShares";
import { ContactSearchInput } from "./ContactSearchInput";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  recordType: string;
  recordId: string;
  shareType: "folder" | "selection";
  folderId?: string | null;
  folderName?: string;
  documents?: DocumentRecord[];
}

const EXPIRY_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Never", days: null },
];

export function ShareDialog({
  open,
  onClose,
  recordType,
  recordId,
  shareType,
  folderId,
  folderName,
  documents,
}: ShareDialogProps) {
  const createShare = useCreateShare();

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContactId, setRecipientContactId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryDays, setExpiryDays] = useState<number | null>(30);
  const [sendEmail, setSendEmail] = useState(true);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
    email: string;
    company_name: string | null;
  } | null>(null);

  if (!open) return null;

  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 86400000).toISOString()
    : null;

  const handleSubmit = async () => {
    const result = await createShare.mutateAsync({
      share_type: shareType,
      folder_id: shareType === "folder" ? (folderId ?? null) : null,
      include_subfolders: shareType === "folder",
      record_type: recordType,
      record_id: recordId,
      allow_download: allowDownload,
      password: requirePassword ? password : undefined,
      expires_at: expiresAt,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_company: recipientCompany,
      recipient_contact_id: recipientContactId,
      message,
      document_ids: shareType === "selection" ? documents?.map((d) => d.id) : undefined,
      send_email: sendEmail,
    });
    setCreatedToken(result.share_token);
  };

  const handleCopyLink = () => {
    if (createdToken) {
      navigator.clipboard.writeText(getShareUrl(createdToken));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Share Documents</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* What's being shared */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sharing</label>
            <div className="mt-1 text-sm text-foreground">
              {shareType === "folder" ? (
                <span>📁 {folderName ?? "All Documents"}</span>
              ) : (
                <span>📄 {documents?.map((d) => d.name).join(", ")}</span>
              )}
            </div>
          </div>

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
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B3022]/20"
                />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B3022]/20"
                />
                <input
                  type="text"
                  value={recipientCompany}
                  onChange={(e) => setRecipientCompany(e.target.value)}
                  placeholder="Company (optional)"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B3022]/20"
                />
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B3022]/20"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Allow download
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requirePassword}
                  onChange={(e) => setRequirePassword(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Require password
              </label>
              {requirePassword && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B3022]/20"
                />
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">Expires</span>
                <select
                  value={expiryDays ?? "never"}
                  onChange={(e) => setExpiryDays(e.target.value === "never" ? null : Number(e.target.value))}
                  className="rounded-md border border-border px-2 py-1 text-sm"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.days ?? "never"}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notification */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notification</label>
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Send email notification to recipient
              </label>
            </div>
          </div>

          {/* Created link preview */}
          {createdToken && (
            <div className="rounded-lg border border-border bg-accent/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Link className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs">{getShareUrl(createdToken)}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#1B3022] hover:bg-accent/50"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50"
          >
            {createdToken ? "Done" : "Cancel"}
          </button>
          {!createdToken && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!recipientEmail || createShare.isPending}
              className="rounded-md bg-[#1B3022] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B3022]/90 disabled:opacity-50"
            >
              {createShare.isPending ? "Sharing..." : "Share & Send Email →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
