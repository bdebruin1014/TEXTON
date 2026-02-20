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
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <RecordTabBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
        <RightPanel />
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
    <div className="flex h-full -m-6">
      {sidebar}
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
