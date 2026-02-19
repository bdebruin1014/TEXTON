import { Activity, CheckSquare, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

type Tab = "tasks" | "notes" | "activity";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: Activity },
];

export function RightPanel() {
  const { rightPanelOpen, setRightPanelOpen } = useUiStore();
  const [activeTab, setActiveTab] = useState<Tab>("tasks");

  if (!rightPanelOpen) return null;

  return (
    <aside
      className="flex h-full flex-col border-l border-border bg-card"
      style={{ width: "var(--right-panel-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  activeTab === tab.id ? "bg-primary-50 text-primary" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setRightPanelOpen(false)}
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-center text-xs text-muted">No {activeTab} yet</p>
      </div>
    </aside>
  );
}
