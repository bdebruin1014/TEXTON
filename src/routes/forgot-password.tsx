import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold tracking-[0.15em] text-primary">TEK{"\u00B7"}TON</h1>
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-2 text-lg font-semibold text-foreground">Check your email</div>
            <p className="text-sm text-muted">
              If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and
              spam folder.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-[0.15em] text-primary">TEK{"\u00B7"}TON</h1>
          <p className="mt-1 text-sm text-muted">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {error && <div className="mb-4 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">{error}</div>}

          <p className="mb-4 text-sm text-muted">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <div className="mb-6">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-button px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Remember your password?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
