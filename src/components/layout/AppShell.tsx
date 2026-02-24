import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { CommandPalette } from "./CommandPalette";
import { RecordTabBar } from "./RecordTabBar";
import { RightPanel } from "./RightPanel";
import { TopNav } from "./TopNav";

interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Context for allowing child pages to override the right panel.
 * Pages call useSetRightPanel(true) on mount to signal they provide
 * their own panel via RightFilterPanel (which portals into #right-panel-slot).
 */
const RightPanelOverrideContext = createContext<(has: boolean) => void>(() => {});

export function useRightPanelOverride() {
  const setHas = useContext(RightPanelOverrideContext);
  useEffect(() => {
    setHas(true);
    return () => setHas(false);
  }, [setHas]);
}

/**
 * Full application shell — Qualia pattern.
 *
 * Layout: dark TopNav on top, then 3 columns:
 *   LEFT: Dark slate sidebar (context-sensitive per module)
 *   CENTER: Content area with RecordTabBar above main (#F1F5F9 bg)
 *   RIGHT: Collapsible white panel (Chat / Tasks / Notes) — swappable via context
 */
export function AppShell({ sidebar, children }: AppShellProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const [hasRightPanelOverride, setHasRightPanelOverride] = useState(false);

  const overrideContextValue = useMemo(() => setHasRightPanelOverride, []);

  return (
    <RightPanelOverrideContext.Provider value={overrideContextValue}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav />
        <div className="flex min-h-0 flex-1 relative">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            />
          )}

          {/* Sidebar — drawer on mobile, sticky on desktop */}
          {sidebar && (
            <div
              className={cn(
                "fixed inset-y-0 left-0 z-40 w-[280px] pt-[var(--topnav-height)]",
                "transform transition-transform duration-200 ease-in-out",
                "lg:sticky lg:top-0 lg:z-auto lg:h-full lg:w-[220px] lg:shrink-0 lg:pt-0 lg:translate-x-0",
                "overflow-y-auto",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
              )}
              style={{ backgroundColor: "var(--color-sidebar)" }}
            >
              {sidebar}
            </div>
          )}

          {/* Content column */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <RecordTabBar />
            <div className="flex min-h-0 flex-1">
              <main
                className="flex-1 overflow-y-auto p-4 md:p-6"
                style={{ backgroundColor: "var(--color-background)" }}
              >
                {children}
              </main>
              <div className="hidden xl:block" id="right-panel-slot">
                {!hasRightPanelOverride && <RightPanel />}
              </div>
            </div>
          </div>
        </div>
        <CommandPalette />
      </div>
    </RightPanelOverrideContext.Provider>
  );
}

/**
 * Content wrapper for pages that provide their own sidebar within
 * the authenticated layout. Does NOT render TopNav/RightPanel —
 * those come from the parent AppShell.
 */
export function PageWithSidebar({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex h-full -m-4 md:-m-6">
      <div className="sticky top-0 h-full shrink-0 overflow-y-auto" style={{ width: "var(--sidebar-width)" }}>
        {sidebar}
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
