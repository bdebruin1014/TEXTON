import { createFileRoute } from "@tanstack/react-router";
import { SharePage } from "@/components/documents/public/SharePage";
import { SharePasswordGate } from "@/components/documents/public/SharePasswordGate";
import { useShareAccess } from "@/hooks/useShareAccess";

export const Route = createFileRoute("/share/$token")({
  component: ShareRoute,
});

function ShareRoute() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useShareAccess(token);

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
          <h1 className="text-lg font-semibold text-foreground">Link Not Available</h1>
          <p className="mt-2 text-sm text-muted">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.share.has_password) {
    return <SharePasswordGate onSubmit={() => {}} />;
  }

  return <SharePage data={data} token={token} />;
}
