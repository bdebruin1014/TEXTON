import type { UploadRequestAccessData } from "@/hooks/useUploadRequestAccess";
import { useFulfillUploadItem } from "@/hooks/useUploadRequestAccess";
import { UploadRequestItemCard } from "./UploadRequestItemCard";

interface UploadRequestPageProps {
  data: UploadRequestAccessData;
  token: string;
}

export function UploadRequestPage({ data, token }: UploadRequestPageProps) {
  const fulfillMutation = useFulfillUploadItem();
  const { request, items } = data;

  const totalItems = items.length;
  const fulfilledItems = items.filter((i) => i.status === "uploaded" || i.status === "accepted").length;
  const progressPct = totalItems > 0 ? Math.round((fulfilledItems / totalItems) * 100) : 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
            TEK
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-sm text-muted">Documents Requested by {request.created_by_name ?? "KOVA User"}</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">{request.subject}</h2>

          {/* Message */}
          {request.message && (
            <div className="mt-3 rounded-lg bg-background px-4 py-3 text-sm text-text-secondary italic">
              "{request.message}"
            </div>
          )}

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            {request.due_date && (
              <span className="text-xs text-muted">Due: {new Date(request.due_date).toLocaleDateString()}</span>
            )}
            <span className="text-xs text-muted">
              {fulfilledItems} of {totalItems} items complete
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Items */}
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <UploadRequestItemCard
                key={item.id}
                name={item.name}
                description={item.description}
                isRequired={item.is_required}
                status={item.status}
                acceptedExtensions={item.accepted_extensions}
                maxFileSize={item.max_file_size}
                fulfilledAt={item.fulfilled_at}
                onUpload={async (file) => {
                  await fulfillMutation.mutateAsync({ token, itemId: item.id, file });
                }}
              />
            ))}
          </div>

          <p className="mt-4 text-[10px] text-slate-400">* = required</p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Powered by KOVA</p>
        </div>
      </div>
    </div>
  );
}
