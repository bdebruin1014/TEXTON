import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { getShareUrl, useDocumentShares, useRevokeShare } from "@/hooks/useDocumentShares";

interface SharedLinksTableProps {
  recordType: string;
  recordId: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  revoked: "bg-red-50 text-red-600",
};

export function SharedLinksTable({ recordType, recordId }: SharedLinksTableProps) {
  const { data: shares = [], isLoading } = useDocumentShares(recordType, recordId);
  const revokeShare = useRevokeShare();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-accent/30" />
        ))}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-sm font-semibold text-foreground">No shared links yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Share files or folders from the Documents tab to create share links.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Shared Links</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-accent/20">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recipient
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expires
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Views
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {shares.map((share) => (
              <tr key={share.id} className="border-b border-border hover:bg-accent/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-foreground">{share.recipient_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{share.recipient_email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{share.share_type}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(share.created_at)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {share.expires_at ? formatDate(share.expires_at) : "Never"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{share.access_count}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[share.status] ?? ""}`}
                  >
                    {share.status}
                  </span>
                </td>
                <td className="relative px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === share.id ? null : share.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent/50"
                  >
                    <span aria-hidden="true">...</span>
                  </button>
                  {menuOpenId === share.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                      <div className="absolute right-0 top-full z-50 min-w-[160px] rounded-lg border border-border bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(getShareUrl(share.share_token));
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50"
                        >
                          Copy Link
                        </button>
                        {share.status === "active" && (
                          <button
                            type="button"
                            onClick={() => {
                              revokeShare.mutate({ shareId: share.id });
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent/50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
