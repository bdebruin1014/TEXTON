import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NAV_MODULES, OPS_DROPDOWN_SECTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

/**
 * Top navigation bar — Qualia pattern.
 *
 * Dark navy (#112233) background — darkest element in the UI.
 * Logo left, text-only module links center, search + user right.
 * Active module gets a green (#4A8C5E) bottom indicator.
 * "Operations" is a mega-dropdown consolidating Operations, Tools, and Reports.
 */

const OPS_PATHS = OPS_DROPDOWN_SECTIONS.flatMap((s) => s.items.map((i) => i.path));

function OperationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useRouterState({ select: (s) => s.location });

  const isActive = open || OPS_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex items-center gap-1 rounded-md px-3 py-3.5 text-[13px] font-medium transition-colors",
          isActive ? "text-white" : "hover:bg-white/[0.04]",
        )}
        style={{ color: isActive ? "#FFFFFF" : "var(--color-nav-muted)" }}
      >
        Operations
        <span className="text-[10px] leading-none">{"\u25BE"}</span>
        {isActive && !open && (
          <span
            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-sm"
            style={{
              background: "var(--color-nav-active)",
              boxShadow: "0 0 8px rgba(72, 187, 120, 0.4)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg py-2 shadow-xl"
          style={{
            backgroundColor: "#1E2A3A",
            border: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          {OPS_DROPDOWN_SECTIONS.map((section, idx) => (
            <div key={section.label}>
              {/* Section header: ALL-CAPS label + horizontal rule */}
              <div className={cn("flex items-center gap-2 px-4 pb-1", idx === 0 ? "pt-1" : "pt-3")}>
                <span
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sidebar-heading)" }}
                >
                  {section.label}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }} />
              </div>

              {/* Section links */}
              {section.items.map((item) => {
                const itemActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path as string}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-4 py-1.5 text-[13px] transition-colors",
                      itemActive ? "font-medium" : "hover:bg-white/5",
                    )}
                    style={{
                      color: itemActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const location = useRouterState({ select: (s) => s.location });
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const setRightPanelOpen = useUiStore((s) => s.setRightPanelOpen);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
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
    : (userEmail[0]?.toUpperCase() ?? "?");

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Split NAV_MODULES: everything before Admin, then Operations dropdown, then Admin
  const beforeAdmin = NAV_MODULES.filter((m) => m.label !== "Admin");
  const admin = NAV_MODULES.find((m) => m.label === "Admin");

  return (
    <header
      className="flex h-[var(--topnav-height)] items-center justify-between px-4"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden px-1 py-1 text-lg"
          style={{ color: "var(--color-nav-muted)" }}
          aria-label="Toggle sidebar"
        >
          {"\u2630"}
        </button>
        <Link to="/dashboard" className="flex items-center">
          <span className="text-sm font-semibold text-white" style={{ letterSpacing: "2px" }}>
            KOVA
          </span>
        </Link>
      </div>

      {/* Center: Module links + Operations dropdown */}
      <nav className="hidden md:flex items-center gap-0.5">
        {beforeAdmin.map((mod) => {
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
                    boxShadow: "0 0 8px rgba(72, 187, 120, 0.4)",
                  }}
                />
              )}
            </Link>
          );
        })}

        {/* Operations mega-dropdown */}
        <OperationsDropdown />

        {/* Admin */}
        {admin &&
          (() => {
            const isActive = location.pathname.startsWith(admin.path);
            return (
              <Link
                to={admin.path}
                className={cn(
                  "relative rounded-md px-3 py-3.5 text-[13px] font-medium transition-colors",
                  isActive ? "text-white" : "hover:bg-white/[0.04]",
                )}
                style={{
                  color: isActive ? "#FFFFFF" : "var(--color-nav-muted)",
                }}
              >
                {admin.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-sm"
                    style={{
                      background: "var(--color-nav-active)",
                      boxShadow: "0 0 8px rgba(72, 187, 120, 0.4)",
                    }}
                  />
                )}
              </Link>
            );
          })()}
      </nav>

      {/* Right: Search + Panel toggle + User */}
      <div className="flex items-center gap-2">
        {/* Search trigger (mobile) */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
          className="md:hidden rounded-md px-2 py-1.5 text-sm"
          style={{ color: "var(--color-nav-muted)" }}
        >
          {"\u2315"}
        </button>

        {/* Search trigger (desktop — mirrors Qualia's "Find order..." box) */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search — press Command K"
          className="hidden md:flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-all"
          style={{
            color: "var(--color-nav-muted)",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            width: 200,
          }}
        >
          <span>Find order...</span>
          <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">{"\u2318"}K</kbd>
        </button>

        {/* Right panel toggle */}
        <button
          type="button"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={cn(
            "hidden xl:block rounded-md px-2 py-1.5 text-sm transition-colors",
            rightPanelOpen ? "text-white" : "hover:text-white/80",
          )}
          style={{ color: rightPanelOpen ? "#FFFFFF" : "var(--color-nav-muted)" }}
          aria-label="Toggle panel"
          title="Toggle right panel"
        >
          {"\u2261"}
        </button>

        {/* User menu */}
        <div ref={userMenuRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-opacity hover:opacity-80"
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
                onClick={() => {
                  setUserMenuOpen(false);
                  signOut().then(() => navigate({ to: "/login" }));
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
