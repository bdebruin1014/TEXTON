import { useState } from "react";
import { useTeams } from "@/hooks/useTeams";
import { cn } from "@/lib/utils";

interface TeamSelectProps {
  value: string | null;
  onChange: (teamId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TeamSelect({ value, onChange, placeholder = "Select team...", className, disabled }: TeamSelectProps) {
  const { data: teams = [] } = useTeams();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = teams.filter((t) => t.status === "Active" && t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm",
          "focus:border-primary focus:ring-1 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className={value ? "text-foreground" : "text-muted"}>
          {value ? (teams.find((t) => t.id === value)?.name ?? placeholder) : placeholder}
        </span>
        <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none"
              /* biome-ignore lint/a11y/noAutofocus: dropdown search needs focus */
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted">No teams found</div>
            ) : (
              filtered.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onChange(team.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    team.id === value && "bg-accent",
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color ?? "#4A8C5E" }} />
                  <span className="flex-1">{team.name}</span>
                  <span className="text-xs text-muted">{team.member_count} members</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
