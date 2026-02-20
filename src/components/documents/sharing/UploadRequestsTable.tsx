import { Clock, Copy, MoreHorizontal, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  getUploadRequestUrl,
  useCancelUploadRequest,
  useSendReminder,
  useUploadRequests,
} from "@/hooks/useUploadRequests";

interface UploadRequestsTableProps {
  recordType: string;
  recordId: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  partial: "bg-blue-50 text-blue-700",
  complete: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

export function UploadRequestsTable({ recordType, recordId }: UploadRequestsTableProps) {
  const { data: requests = [], isLoading } = useUploadRequests(recordType, recordId);
  const cancelRequest = useCancelUploadRequest();
  const sendReminder = useSendReminder();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-accent/30" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Send className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No upload requests yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Request documents from external parties using the "Request Upload" button.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Upload Requests</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-accent/20">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recipient
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Items
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Due
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const totalItems = req.items?.length ?? 0;
              const fulfilledItems = req.items?.filter((i) => i.status === "uploaded" || i.status === "accepted").length ?? 0;

              return (
                <tr
                  key={req.id}
                  className="border-b border-border hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{req.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{req.recipient_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{req.subject}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {fulfilledItems} / {totalItems}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {req.due_date ? formatDate(req.due_date) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[req.status] ?? ""}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === req.id ? null : req.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent/50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpenId === req.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-full z-50 min-w-[180px] rounded-lg border border-border bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(getUploadRequestUrl(req.request_token));
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy Link
                          </button>
                          {(req.status === "pending" || req.status === "partial") && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  sendReminder.mutate({ requestId: req.id });
                                  setMenuOpenId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50"
                              >
                                <Clock className="h-3.5 w-3.5" /> Send Reminder
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  cancelRequest.mutate({ requestId: req.id });
                                  setMenuOpenId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent/50"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
