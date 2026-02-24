import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/shared/PageTransition";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
  errorComponent: AuthenticatedErrorPage,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <PageTransition key={pathname}>
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </AppShell>
  );
}

function AuthenticatedErrorPage({ error }: ErrorComponentProps) {
  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive-bg">
            <span className="text-xl font-medium text-destructive">!</span>
          </div>
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="mt-1 text-sm text-muted">An unexpected error occurred while loading this page.</p>
          {error instanceof Error && error.message && (
            <p className="mt-3 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">{error.message}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-button px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/20"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
