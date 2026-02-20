import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TektonLogo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { NAV_MODULES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

export function TopNav() {
  const location = useRouterState({ select: (s) => s.location });
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fullName = (user?.user_metadata?.full_name as string) ?? "";
  const userEmail = user?.email ?? "";
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header
      className="flex h-[var(--topnav-height)] items-center justify-between px-4"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderBottom: "1px solid transparent",
        borderImage: "linear-gradient(90deg, transparent, rgba(107, 158, 122, 0.2), transparent) 1",
      }}
    >
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center">
        <TektonLogo />
      </Link>

      {/* Module Links — text only, no icons */}
      <nav className="flex items-center gap-0.5">
        {NAV_MODULES.map((mod) => {
          const isActive = location.pathname.startsWith(mod.path);
          return (
            <Link
              key={mod.label}
              to={mod.path}
              className={cn(
                "relative rounded-md px-3 py-3.5 text-[13px] font-medium transition-colors",
                isActive ? "text-white" : "hover:bg-white/[0.04]",
              )}
              style={{
                color: isActive ? "#FFFFFF" : "var(--color-nav-muted)",
              }}
            >
              {mod.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-sm"
                  style={{
                    background: "var(--color-nav-active)",
                    boxShadow: "0 0 8px rgba(107, 158, 122, 0.4)",
                  }}
                />
              )}
            </Link>
          );
        })}

      </nav>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search — press Command K"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-all focus:w-[260px]"
          style={{
            color: "var(--color-nav-muted)",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            width: 200,
          }}
        >
          <span>Search...</span>
          <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
            {"\u2318"}K
          </kbd>
        </button>

        {/* User menu */}
        <div ref={userMenuRef} className="relative ml-2">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-opacity hover:opacity-80"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-700))",
              color: "var(--color-primary-accent)",
            }}
            aria-label="User menu"
          >
            {initials}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/10 bg-[#112233] py-1 shadow-lg">
              <div className="border-b border-white/10 px-3 py-2">
                <div className="text-xs font-medium text-white">{fullName || "No name set"}</div>
                <div className="text-[11px] text-white/50">{userEmail}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Account Settings
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setUserMenuOpen(false);
                  await signOut();
                  navigate({ to: "/login" });
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
