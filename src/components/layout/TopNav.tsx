import { Link, useRouterState } from "@tanstack/react-router";
import { TektonLogo } from "@/components/layout/Logo";
import { NAV_MODULES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

export function TopNav() {
  const location = useRouterState({ select: (s) => s.location });
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

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
          const isDisabled = "disabled" in mod && mod.disabled;

          if (isDisabled) {
            return (
              <Link
                key={mod.label}
                to={mod.path}
                className="relative rounded-md px-3 py-3.5 text-[13px] font-medium opacity-40"
                style={{ color: "var(--color-nav-muted)" }}
              >
                {mod.label}
              </Link>
            );
          }

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

        {/* User avatar — initials on gradient green */}
        <div
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-700))",
            color: "var(--color-primary-accent)",
          }}
        >
          BD
        </div>
      </div>
    </header>
  );
}
