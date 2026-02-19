import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calculator,
  CalendarDays,
  FolderKanban,
  GitBranch,
  HardHat,
  Home,
  Search,
  Settings,
  Target,
  Users,
  Wrench,
} from "lucide-react";
import { NAV_MODULES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  FolderKanban,
  HardHat,
  Home,
  Calculator,
  Users,
  GitBranch,
  CalendarDays,
  Wrench,
  Settings,
};

export function TopNav() {
  const location = useRouterState({ select: (s) => s.location });
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <header
      className="flex h-[var(--topnav-height)] items-center justify-between px-4"
      style={{ backgroundColor: "var(--color-nav-bg)" }}
    >
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 text-white">
        <span className="text-lg font-bold tracking-tight">TEKTON</span>
      </Link>

      {/* Module Links */}
      <nav className="flex items-center gap-0.5">
        {NAV_MODULES.map((mod) => {
          const Icon = iconMap[mod.icon];
          const isActive = location.pathname.startsWith(mod.path);
          const isDisabled = "disabled" in mod && mod.disabled;

          if (isDisabled) {
            return (
              <Link
                key={mod.label}
                to={mod.path}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium opacity-40"
                style={{ color: "var(--color-nav-muted)" }}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{mod.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={mod.label}
              to={mod.path}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive ? "bg-white/10" : "hover:bg-white/5",
              )}
              style={{ color: isActive ? "var(--color-nav-active)" : "var(--color-nav-muted)" }}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5"
          style={{ color: "var(--color-nav-muted)" }}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-1 hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            &#x2318;K
          </kbd>
        </button>

        <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
          B
        </div>
      </div>
    </header>
  );
}
