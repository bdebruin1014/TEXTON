import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { queryClient } from "@/lib/queryClient";
import { Sentry } from "@/lib/sentry";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 30_000,
  defaultPendingMs: 200,
  defaultPendingComponent: PageSkeleton,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function ErrorFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">An unexpected error occurred. Please reload the page.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}
