import { useState } from "react";
import { getVariablesForRecordType, type VariableGroup } from "@/lib/documents/template-variables";

interface VariablePickerProps {
  recordType: string;
  onInsert: (variable: string) => void;
}

export function VariablePicker({ recordType, onInsert }: VariablePickerProps) {
  const [search, setSearch] = useState("");
  const groups = getVariablesForRecordType(recordType);

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      variables: group.variables.filter(
        (v) =>
          v.label.toLowerCase().includes(search.toLowerCase()) || v.key.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g) => g.variables.length > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-card p-3 border-b border-border">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Variables</p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variables..."
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none"
        />
      </div>

      <div className="p-3 space-y-4">
        {filteredGroups.map((group) => (
          <VariableGroupSection key={group.label} group={group} onInsert={onInsert} />
        ))}

        {filteredGroups.length === 0 && <p className="text-xs text-muted">No matching variables</p>}
      </div>
    </div>
  );
}

function VariableGroupSection({ group, onInsert }: { group: VariableGroup; onInsert: (variable: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{group.label}</p>
      <div className="space-y-0.5">
        {group.variables.map((variable) => (
          <button
            key={variable.key}
            type="button"
            onClick={() => onInsert(`{{${variable.key}}}`)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            title={variable.description ?? `Insert {{${variable.key}}}`}
          >
            <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[10px] text-primary">
              {`{{${variable.key}}}`}
            </span>
            <span className="text-muted">{variable.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
