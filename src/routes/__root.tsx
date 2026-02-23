import { createRootRoute, type ErrorComponentProps, Link, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Sentry } from "@/lib/sentry";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RootErrorPage,
});

function RootLayout() {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <RootErrorPage error={new Error("An unexpected error occurred")} reset={() => window.location.reload()} />
      }
    >
      <Outlet />
      <Toaster position="bottom-right" richColors closeButton />
    </Sentry.ErrorBoundary>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-[2px] text-primary-accent">KOVA</h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <p className="text-5xl font-bold text-foreground">404</p>
          <p className="mt-2 text-lg font-semibold text-foreground">Page Not Found</p>
          <p className="mt-1 text-sm text-muted">The page you're looking for doesn't exist or has been moved.</p>

          <Link
            to="/dashboard"
            className="mt-6 inline-block w-full rounded-lg bg-button px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function RootErrorPage({ error }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-[2px] text-primary-accent">KOVA</h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <p className="text-5xl font-bold text-foreground">!</p>
          <p className="mt-2 text-lg font-semibold text-foreground">Something went wrong</p>
          {error instanceof Error && error.message && (
            <p className="mt-2 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">{error.message}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/dashboard"
              className="w-full rounded-lg bg-button px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/20"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
