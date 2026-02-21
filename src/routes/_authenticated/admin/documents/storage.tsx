import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/documents/storage")({
  component: StorageUsagePage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BucketStats {
  name: string;
  label: string;
  fileCount: number;
  totalSize: number;
  percentOfTotal: number;
}

interface StorageSummary {
  totalSize: number;
  totalDocuments: number;
  averageFileSize: number;
  buckets: BucketStats[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKETS = [
  { name: "project-docs", label: "Project Documents" },
  { name: "job-docs", label: "Job Documents" },
  { name: "disposition-docs", label: "Disposition Documents" },
  { name: "entity-docs", label: "Entity Documents" },
  { name: "contact-docs", label: "Contact Documents" },
  { name: "templates", label: "Templates" },
] as const;

const BUCKET_COLORS: Record<string, string> = {
  "project-docs": "bg-emerald-500",
  "job-docs": "bg-blue-500",
  "disposition-docs": "bg-purple-500",
  "entity-docs": "bg-amber-500",
  "contact-docs": "bg-rose-500",
  templates: "bg-slate-500",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// useStorageUsage hook
// ---------------------------------------------------------------------------

function useStorageUsage() {
  return useQuery<StorageSummary>({
    queryKey: ["admin", "storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("file_size, bucket");
      if (error) throw error;

      const docs = data ?? [];
      const totalDocuments = docs.length;
      const totalSize = docs.reduce(
        (sum: number, d: { file_size: number | null }) => sum + ((d.file_size as number) ?? 0),
        0,
      );
      const averageFileSize = totalDocuments > 0 ? Math.round(totalSize / totalDocuments) : 0;

      // Aggregate per bucket
      const bucketMap = new Map<string, { fileCount: number; totalSize: number }>();
      for (const bucket of BUCKETS) {
        bucketMap.set(bucket.name, { fileCount: 0, totalSize: 0 });
      }

      for (const doc of docs) {
        const bucket = (doc.bucket as string) ?? "unknown";
        const existing = bucketMap.get(bucket);
        if (existing) {
          existing.fileCount += 1;
          existing.totalSize += (doc.file_size as number) ?? 0;
        }
      }

      const buckets: BucketStats[] = BUCKETS.map((b) => {
        const stats = bucketMap.get(b.name)!;
        return {
          name: b.name,
          label: b.label,
          fileCount: stats.fileCount,
          totalSize: stats.totalSize,
          percentOfTotal: totalSize > 0 ? (stats.totalSize / totalSize) * 100 : 0,
        };
      });

      return { totalSize, totalDocuments, averageFileSize, buckets };
    },
  });
}

// ---------------------------------------------------------------------------
// FormSkeleton / Loading
// ---------------------------------------------------------------------------

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-lg p-5">
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-3" />
            <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-slate-50">
              <th className="text-left px-4 py-3">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </th>
              <th className="text-left px-4 py-3">
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              </th>
              <th className="text-left px-4 py-3">
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              </th>
              <th className="text-left px-4 py-3">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-4 py-4">
                  <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function StorageUsagePage() {
  const { data: storage, isLoading } = useStorageUsage();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Storage Usage</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor document storage across all buckets</p>
      </div>

      {isLoading || !storage ? (
        <FormSkeleton />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Storage Used" value={formatBytes(storage.totalSize)} />
            <SummaryCard label="Total Documents" value={storage.totalDocuments.toLocaleString()} />
            <SummaryCard label="Average File Size" value={formatBytes(storage.averageFileSize)} />
          </div>

          {/* Visual overview bar */}
          <div className="bg-white border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Storage Distribution</h2>
            <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
              {storage.buckets
                .filter((b) => b.percentOfTotal > 0)
                .map((bucket) => (
                  <div
                    key={bucket.name}
                    className={cn("h-full transition-all", BUCKET_COLORS[bucket.name] ?? "bg-slate-400")}
                    style={{ width: `${Math.max(bucket.percentOfTotal, 1)}%` }}
                    title={`${bucket.label}: ${formatBytes(bucket.totalSize)} (${bucket.percentOfTotal.toFixed(1)}%)`}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {storage.buckets
                .filter((b) => b.percentOfTotal > 0)
                .map((bucket) => (
                  <div key={bucket.name} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-sm", BUCKET_COLORS[bucket.name] ?? "bg-slate-400")} />
                    <span className="text-xs text-slate-600">{bucket.label}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Bucket
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Files
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Size
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {storage.buckets.map((bucket) => (
                  <tr key={bucket.name} className="border-b border-border hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("w-3 h-3 rounded-sm shrink-0", BUCKET_COLORS[bucket.name] ?? "bg-slate-400")}
                        />
                        <span className="text-sm font-medium text-slate-800">{bucket.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{bucket.fileCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatBytes(bucket.totalSize)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              BUCKET_COLORS[bucket.name] ?? "bg-slate-400",
                            )}
                            style={{ width: `${bucket.percentOfTotal}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-12 text-right">
                          {bucket.percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
