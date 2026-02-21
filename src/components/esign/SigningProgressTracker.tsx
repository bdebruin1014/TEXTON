import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Signer {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string;
  signed_date: string | null;
  sort_order: number;
  embed_url: string | null;
}

interface SigningProgressTrackerProps {
  documentId: string;
}

const SIGNER_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-accent text-muted-foreground",
  Sent: "bg-info-bg text-info-text",
  Viewed: "bg-info-bg text-info-text",
  Signed: "bg-success-bg text-success-text",
  Declined: "bg-destructive-bg text-destructive-text",
};

export function SigningProgressTracker({ documentId }: SigningProgressTrackerProps) {
  const { data: signers = [], isLoading } = useQuery<Signer[]>({
    queryKey: ["esign-signers", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esign_signers")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!documentId,
  });

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-lg bg-accent" />;
  }

  if (signers.length === 0) {
    return <p className="text-sm text-muted">No signers assigned yet.</p>;
  }

  const completedCount = signers.filter((s) => s.status === "Signed").length;
  const progress = signers.length > 0 ? (completedCount / signers.length) * 100 : 0;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>
            {completedCount} of {signers.length} signed
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-accent">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Signer timeline */}
      <div className="space-y-2">
        {signers.map((signer, idx) => (
          <div key={signer.id} className="flex items-center gap-3">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center">
              <div className={`h-3 w-3 rounded-full ${signer.status === "Signed" ? "bg-primary" : "bg-border"}`} />
              {idx < signers.length - 1 && <div className="h-8 w-px bg-border" />}
            </div>

            {/* Signer info */}
            <div className="flex flex-1 items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="text-sm font-medium">{signer.name ?? signer.email}</div>
                <div className="text-xs text-muted">
                  {signer.role}
                  {signer.signed_date && (
                    <span>
                      {" "}
                      &middot; Signed{" "}
                      {new Date(signer.signed_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    SIGNER_STATUS_STYLES[signer.status] ?? "bg-accent text-muted-foreground"
                  }`}
                >
                  {signer.status}
                </span>
                {signer.embed_url && signer.status !== "Signed" && (
                  <a
                    href={signer.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Sign Link
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
