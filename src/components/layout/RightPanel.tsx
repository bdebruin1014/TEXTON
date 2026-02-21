import { useState } from "react";
import { useUiStore } from "@/stores/uiStore";

interface CollapsibleSectionProps {
  title: string;
  count?: string;
  defaultOpen?: boolean;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}

/**
 * Collapsible section within the right panel.
 * Matches Qualia's style: dashed separator, ALL-CAPS title,
 * triangle toggle, optional action button on the right.
 */
function CollapsibleSection({ title, count, defaultOpen = true, action, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: "var(--color-text-hint)" }}>
            {open ? "\u25BE" : "\u25B8"}
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {title}
          </span>
          {count && (
            <span className="text-[11px] font-normal" style={{ color: "var(--color-muted)" }}>
              {count}
            </span>
          )}
        </span>
        {action && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-accent"
            style={{ color: "var(--color-primary-accent)" }}
          >
            {action.label}
          </button>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * Right panel — Qualia pattern.
 *
 * WHITE background, sits on the far right. Contains collapsible
 * sections for CHAT, TASKS, and NOTES — matching Qualia exactly.
 * CHAT has Messages/Channels tabs. TASKS shows count. NOTES has
 * an "+ Add" action.
 */
export function RightPanel() {
  const { rightPanelOpen } = useUiStore();

  if (!rightPanelOpen) return null;

  return (
    <aside
      aria-label="Chat, tasks, and notes panel"
      className="flex h-full flex-col border-l bg-card"
      style={{
        width: "var(--right-panel-width)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* CHAT section */}
      <CollapsibleSection title="Chat" defaultOpen={false}>
        <div className="space-y-1">
          <div className="flex gap-2 pb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-xs font-medium"
              style={{
                borderBottom: "2px solid var(--color-primary-accent)",
                color: "var(--color-foreground)",
              }}
            >
              Messages
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              Channels
            </button>
          </div>
          <p className="py-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
            No messages yet
          </p>
        </div>
      </CollapsibleSection>

      {/* TASKS section */}
      <CollapsibleSection title="Tasks" count="0 / 0">
        <div
          className="rounded-md p-3 text-center text-xs"
          style={{
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            color: "var(--color-muted)",
          }}
        >
          You have not been assigned any tasks on this record
        </div>
      </CollapsibleSection>

      {/* NOTES section */}
      <CollapsibleSection
        title="Notes"
        action={{
          label: "+ Add",
          onClick: () => {
            /* TODO: open add note dialog */
          },
        }}
      >
        <p className="py-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          No notes yet
        </p>
      </CollapsibleSection>

      {/* Spacer pushes content to top */}
      <div className="flex-1" />
    </aside>
  );
}
