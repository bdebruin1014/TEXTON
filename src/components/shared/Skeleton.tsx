import { cn } from "@/lib/utils";

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-border", className)} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={`h-${i.toString()}`} className="h-3 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`r-${rowIdx.toString()}`} className="flex gap-4 border-b border-border/50 px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonPulse key={`c-${colIdx.toString()}`} className={cn("h-4", colIdx === 0 ? "w-32" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={`card-${i.toString()}`} className="rounded-lg border border-border bg-card p-6">
          <SkeletonPulse className="mb-2 h-3 w-20" />
          <SkeletonPulse className="mb-1 h-7 w-28" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <SkeletonPulse className="mb-6 h-5 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={`f-${i.toString()}`}>
            <SkeletonPulse className="mb-2 h-3 w-20" />
            <SkeletonPulse className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonPulse className="mb-2 h-6 w-48" />
        <SkeletonPulse className="h-4 w-64" />
      </div>
      <CardGridSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <SkeletonPulse className="mb-2 h-6 w-32" />
        <SkeletonPulse className="h-4 w-48" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`kpi-${i.toString()}`} className="rounded-lg border border-border bg-card p-5">
            <SkeletonPulse className="mb-2 h-3 w-24" />
            <SkeletonPulse className="mb-1 h-8 w-20" />
            <SkeletonPulse className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`section-${i.toString()}`} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <SkeletonPulse className="h-4 w-28" />
              <SkeletonPulse className="h-3 w-16" />
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={`item-${j.toString()}`} className="flex items-center justify-between">
                  <div>
                    <SkeletonPulse className="mb-1 h-4 w-36" />
                    <SkeletonPulse className="h-3 w-20" />
                  </div>
                  <SkeletonPulse className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { SkeletonPulse };
