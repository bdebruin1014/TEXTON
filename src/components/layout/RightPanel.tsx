import { useState } from "react";
import { useUiStore } from "@/stores/uiStore";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, action, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-card-hover"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]">{open ? "\u25BE" : "\u25B8"}</span>
          {title}
        </span>
        {action && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal transition-colors hover:bg-accent"
            style={{ color: "var(--color-primary-accent)" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                action.onClick();
              }
            }}
          >
            {action.label}
          </span>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function RightPanel() {
  const { rightPanelOpen, setRightPanelOpen } = useUiStore();

  if (!rightPanelOpen) return null;

  return (
    <aside
      role="complementary"
      aria-label="Tasks, notes, and activity panel"
      className="flex h-full flex-col border-l border-border bg-card"
      style={{ width: "var(--right-panel-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-foreground">Panel</span>
        <button
          type="button"
          onClick={() => setRightPanelOpen(false)}
          aria-label="Close panel"
          className="rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          {"\u00D7"}
        </button>
      </div>

      {/* Stacked collapsible sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Chat */}
        <CollapsibleSection title="Chat" defaultOpen={false}>
          <p className="text-center text-xs text-muted">No messages yet</p>
        </CollapsibleSection>

        {/* Tasks — linked to current user */}
        <CollapsibleSection title="My Tasks">
          <p className="text-center text-xs text-muted">No tasks assigned</p>
        </CollapsibleSection>

        {/* Notes */}
        <CollapsibleSection
          title="Notes"
          action={{
            label: "+ Add Note",
            onClick: () => {
              /* TODO: open add note dialog */
            },
          }}
        >
          <p className="text-center text-xs text-muted">No notes yet</p>
        </CollapsibleSection>
      </div>
    </aside>
  );
}
