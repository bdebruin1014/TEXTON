import { useState } from "react";

interface SharePasswordGateProps {
  onSubmit: (password: string) => void;
  error?: string;
}

export function SharePasswordGate({ onSubmit, error }: SharePasswordGateProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#E2E8F0] bg-white p-8 shadow-sm text-center">
        <h1 className="text-lg font-semibold text-foreground">Password Required</h1>
        <p className="mt-1 text-sm text-muted">This share link is password protected.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(password);
          }}
          className="mt-6 space-y-3"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={!password}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            View Documents
          </button>
        </form>
      </div>
    </div>
  );
}
