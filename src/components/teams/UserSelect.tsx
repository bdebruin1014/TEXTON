import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string;
}

interface UserSelectProps {
  value: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  excludeIds?: string[];
}

export function UserSelect({
  value,
  onChange,
  placeholder = "Select user...",
  className,
  disabled,
  excludeIds = [],
}: UserSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: users = [] } = useQuery<UserProfile[]>({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name, email, avatar_url, role, status")
        .eq("status", "Active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = users.filter(
    (u) =>
      !excludeIds.includes(u.id) &&
      (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())),
  );

  const selectedUser = users.find((u) => u.id === value);

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

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
        <span className={selectedUser ? "text-foreground" : "text-muted"}>
          {selectedUser ? (selectedUser.full_name ?? selectedUser.email) : placeholder}
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
              placeholder="Search users..."
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none"
              /* biome-ignore lint/a11y/noAutofocus: dropdown search needs focus */
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted">No users found</div>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onChange(user.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    user.id === value && "bg-accent",
                  )}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {getInitials(user.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{user.full_name ?? "Unnamed"}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
