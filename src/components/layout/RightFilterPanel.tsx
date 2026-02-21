import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRightPanelOverride } from "./AppShell";

interface RightFilterPanelProps {
  children: React.ReactNode;
}

/**
 * Reusable right-side filter panel that portals into AppShell's
 * right panel slot, replacing the default Chat/Tasks/Notes panel.
 *
 * Usage:
 *   <RightFilterPanel>
 *     <FilterSection label="QUERY">
 *       <input ... />
 *     </FilterSection>
 *   </RightFilterPanel>
 *
 * The panel automatically hides the default RightPanel on mount
 * and restores it on unmount.
 */
export function RightFilterPanel({ children }: RightFilterPanelProps) {
  useRightPanelOverride();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("right-panel-slot"));
  }, []);

  if (!target) return null;

  return createPortal(
    <aside
      aria-label="Filter panel"
      className="flex h-full flex-col overflow-y-auto border-l bg-card"
      style={{
        width: "var(--right-panel-width)",
        borderColor: "var(--color-border)",
      }}
    >
      {children}
    </aside>,
    target,
  );
}

interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
}

/**
 * Section within the filter panel — ALL-CAPS label with content below.
 */
export function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <span
        className="mb-2 block text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

interface FilterToggleGroupProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Inline toggle group for filter options (e.g. All | Debits | Credits).
 */
export function FilterToggleGroup({ options, value, onChange }: FilterToggleGroupProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="rounded px-2 py-1 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: isActive ? "var(--color-primary)" : "var(--color-background)",
              color: isActive ? "#FFFFFF" : "var(--color-text-secondary)",
              border: isActive ? "none" : "1px solid var(--color-border)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface FilterClickListProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Vertical clickable list for filter options (e.g. statement types).
 */
export function FilterClickList({ options, value, onChange }: FilterClickListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="rounded px-2 py-1 text-left text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: isActive ? "rgba(72, 187, 120, 0.1)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
