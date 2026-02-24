import { createFileRoute } from "@tanstack/react-router";
import { UploadRequestPage } from "@/components/documents/public/UploadRequestPage";
import { useUploadRequestAccess } from "@/hooks/useUploadRequestAccess";

export const Route = createFileRoute("/upload/$token")({
  component: UploadRoute,
});

function UploadRoute() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useUploadRequestAccess(token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Request Not Available</h1>
          <p className="mt-2 text-sm text-muted">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return <UploadRequestPage data={data} token={token} />;
}
