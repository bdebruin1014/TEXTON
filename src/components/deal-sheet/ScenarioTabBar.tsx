import type { DealSheetRecord } from "@/components/deal-sheet/DealSheetForm";

const VERDICT_DOT: Record<string, string> = {
  STRONG: "bg-[#3D7A4E]",
  GOOD: "bg-[#4A8C5E]",
  ACCEPTABLE: "bg-[#4A8C5E]",
  MARGINAL: "bg-[#C4841D]",
  CAUTION: "bg-[#C4841D]",
  "NO GO": "bg-[#B84040]",
  OVERPAYING: "bg-[#B84040]",
};

interface ScenarioTabBarProps {
  sheets: DealSheetRecord[];
  activeId: string | null;
  compareMode: boolean;
  onSelect: (id: string) => void;
  onCompare: () => void;
}

export function ScenarioTabBar({ sheets, activeId, compareMode, onSelect, onCompare }: ScenarioTabBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
      {sheets.map((sheet) => {
        const isActive = !compareMode && sheet.id === activeId;
        return (
          <button
            key={sheet.id}
            type="button"
            onClick={() => onSelect(sheet.id)}
            className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary bg-card text-foreground"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            {sheet.is_primary && (
              <span className="text-[#C4841D]" title="Primary scenario">
                &#9733;
              </span>
            )}
            <span>{sheet.scenario_name || sheet.name || `Scenario ${sheet.scenario_number ?? ""}`}</span>
            {sheet.profit_verdict && (
              <span
                className={`inline-block h-2 w-2 rounded-full ${VERDICT_DOT[sheet.profit_verdict] ?? "bg-gray-400"}`}
                title={`NPM: ${sheet.profit_verdict}`}
              />
            )}
            {sheet.land_verdict && (
              <span
                className={`inline-block h-2 w-2 rounded-full ${VERDICT_DOT[sheet.land_verdict] ?? "bg-gray-400"}`}
                title={`LCR: ${sheet.land_verdict}`}
              />
            )}
          </button>
        );
      })}
      {sheets.length > 1 && (
        <button
          type="button"
          onClick={onCompare}
          className={`shrink-0 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            compareMode
              ? "border-primary bg-card text-foreground"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          Compare All
        </button>
      )}
    </div>
  );
}
