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
 * Full application shell with TopNav, record tabs, optional sidebar, main content, and right panel.
 * Used by _authenticated layout to wrap all authenticated pages.
 */
export function AppShell({ sidebar, children }: AppShellProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Sidebar — drawer on mobile, static on desktop */}
        {sidebar && (
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-[280px] pt-[var(--topnav-height)]",
              "transform transition-transform duration-200 ease-in-out",
              "lg:relative lg:z-auto lg:w-[240px] lg:pt-0 lg:translate-x-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            {sidebar}
          </div>
        )}

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <RecordTabBar />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</main>
            <div className="hidden xl:block">
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}

/**
 * Content wrapper for pages that provide their own sidebar within the authenticated layout.
 * Does NOT render TopNav/RightPanel — those come from the parent AppShell.
 */
export function PageWithSidebar({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex h-full -m-4 md:-m-6">
      {sidebar}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
