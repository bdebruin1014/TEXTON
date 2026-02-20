import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityLogProps {
  recordType: string;
  recordId: string;
  documentId?: string;
}

interface DocumentActivityRecord {
  id: string;
  document_id: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  document: {
    name: string;
    file_extension: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { text: string; label: string; color: string }> = {
  upload: { text: "Up", label: "uploaded", color: "text-emerald-600 bg-emerald-50" },
  download: { text: "Dl", label: "downloaded", color: "text-blue-600 bg-blue-50" },
  view: { text: "Vw", label: "viewed", color: "text-slate-600 bg-slate-100" },
  edit: { text: "Ed", label: "edited", color: "text-amber-600 bg-amber-50" },
  rename: { text: "Rn", label: "renamed", color: "text-purple-600 bg-purple-50" },
  move: { text: "Mv", label: "moved", color: "text-indigo-600 bg-indigo-50" },
  archive: { text: "Ar", label: "archived", color: "text-orange-600 bg-orange-50" },
  delete: { text: "Del", label: "deleted", color: "text-red-600 bg-red-50" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action.toLowerCase()] ?? { text: "?", label: action, color: "text-slate-600 bg-slate-100" };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyActivity() {
  return (
    <div className="text-center py-8">
      <span className="block w-10 h-10 text-slate-300 mx-auto mb-3 text-2xl leading-10 text-center">--</span>
      <p className="text-sm text-slate-500">No activity recorded yet.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityLog({ recordType, recordId, documentId }: ActivityLogProps) {
  const { data: activities, isLoading } = useQuery<DocumentActivityRecord[]>({
    queryKey: ["document-activity", recordType, recordId, documentId],
    queryFn: async () => {
      let query = supabase
        .from("document_activity")
        .select("*, document:documents(name, file_extension)")
        .order("created_at", { ascending: false })
        .limit(50);

      // Filter by record via the document relationship
      // We need to filter on the joined documents table
      query = query.eq("document.record_type", recordType).eq("document.record_id", recordId);

      if (documentId) {
        query = query.eq("document_id", documentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out entries where the document join didn't match (null document means
      // it didn't satisfy the record_type/record_id filter)
      return ((data as DocumentActivityRecord[]) ?? []).filter((a) => a.document !== null);
    },
  });

  if (isLoading) return <ActivitySkeleton />;
  if (!activities || activities.length === 0) return <EmptyActivity />;

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const config = getActionConfig(activity.action);
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex items-start gap-3 relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-8 w-px h-[calc(100%+4px)] bg-slate-200" />
            )}

            {/* Icon */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative z-10",
                config.color,
              )}
            >
              <span className="text-xs font-bold">{config.text}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-1">
              <p className="text-sm text-slate-700">
                {activity.performed_by && (
                  <span className="font-medium text-slate-900">{activity.performed_by}</span>
                )}
                {activity.performed_by ? " " : ""}
                <span>{config.label}</span>{" "}
                {activity.document && (
                  <span className="font-medium text-slate-800">
                    {activity.document.name}
                    {activity.document.file_extension ? `.${activity.document.file_extension.replace(".", "")}` : ""}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(activity.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
