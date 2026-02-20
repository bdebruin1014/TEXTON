import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const isDev = import.meta.env.DEV;

  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || undefined,

    // Trace 100% in development, 20% in production
    tracesSampleRate: isDev ? 1.0 : 0.2,

    // No session replays in development, 10% in production
    replaysSessionSampleRate: isDev ? 0 : 0.1,

    // Always capture replays when an error occurs
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      // Scrub potential PII from user context
      if (event.user) {
        delete event.user.email;
      }
      return event;
    },
  });
}

export { Sentry };
