import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface LinkedRecord {
  record_type: string;
  record_id: string;
  label: string;
}

interface RecordLinkerProps {
  linkedRecords: LinkedRecord[];
  onChange: (records: LinkedRecord[]) => void;
}

interface SearchResult {
  record_type: string;
  record_id: string;
  label: string;
}

interface GroupedResults {
  [key: string]: SearchResult[];
}

const TYPE_LABELS: Record<string, string> = {
  project: "Projects",
  opportunity: "Opportunities",
  contact: "Contacts",
  entity: "Entities",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-700",
  opportunity: "bg-amber-100 text-amber-700",
  contact: "bg-success-bg text-green-700",
  entity: "bg-purple-100 text-purple-700",
};

export function RecordLinker({ linkedRecords, onChange }: RecordLinkerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchRecords = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const [projects, opportunities, contacts, entities] = await Promise.all([
        supabase.from("projects").select("id, project_name").ilike("project_name", `%${term}%`).limit(5),
        supabase.from("opportunities").select("id, opportunity_name").ilike("opportunity_name", `%${term}%`).limit(5),
        supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
          .limit(5),
        supabase.from("entities").select("id, name").ilike("name", `%${term}%`).limit(5),
      ]);

      const allResults: SearchResult[] = [];

      if (projects.data) {
        for (const p of projects.data) {
          allResults.push({
            record_type: "project",
            record_id: p.id,
            label: p.project_name ?? "Untitled Project",
          });
        }
      }

      if (opportunities.data) {
        for (const o of opportunities.data) {
          allResults.push({
            record_type: "opportunity",
            record_id: o.id,
            label: o.opportunity_name ?? "Untitled Opportunity",
          });
        }
      }

      if (contacts.data) {
        for (const c of contacts.data) {
          allResults.push({
            record_type: "contact",
            record_id: c.id,
            label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unnamed Contact",
          });
        }
      }

      if (entities.data) {
        for (const e of entities.data) {
          allResults.push({
            record_type: "entity",
            record_id: e.id,
            label: e.name ?? "Unnamed Entity",
          });
        }
      }

      setResults(allResults);
      setShowDropdown(allResults.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchRecords(value), 300);
    },
    [searchRecords],
  );

  const addRecord = useCallback(
    (result: SearchResult) => {
      const alreadyLinked = linkedRecords.some(
        (r) => r.record_type === result.record_type && r.record_id === result.record_id,
      );
      if (!alreadyLinked) {
        onChange([...linkedRecords, result]);
      }
      setSearchTerm("");
      setResults([]);
      setShowDropdown(false);
    },
    [linkedRecords, onChange],
  );

  const removeRecord = useCallback(
    (index: number) => {
      const updated = linkedRecords.filter((_, i) => i !== index);
      onChange(updated);
    },
    [linkedRecords, onChange],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const grouped: GroupedResults = {};
  for (const r of results) {
    const key = r.record_type;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    (grouped[key] as SearchResult[]).push(r);
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search projects, contacts, entities..."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>
        )}

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
            {Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-accent/50">
                  {TYPE_LABELS[type] ?? type}
                </div>
                {items.map((item) => {
                  const isAlreadyLinked = linkedRecords.some(
                    (r) => r.record_type === item.record_type && r.record_id === item.record_id,
                  );
                  return (
                    <button
                      key={`${item.record_type}-${item.record_id}`}
                      type="button"
                      onClick={() => addRecord(item)}
                      disabled={isAlreadyLinked}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        isAlreadyLinked
                          ? "text-muted-foreground cursor-not-allowed opacity-50"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <span className="truncate flex-1">{item.label}</span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[item.record_type] ?? "bg-accent text-muted-foreground"}`}
                      >
                        {type}
                      </span>
                      {isAlreadyLinked && <span className="text-xs text-muted-foreground">(linked)</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {linkedRecords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {linkedRecords.map((record, index) => (
            <span
              key={`${record.record_type}-${record.record_id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/50 px-3 py-1 text-xs text-foreground"
            >
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[record.record_type] ?? "bg-accent text-muted-foreground"}`}
              >
                {record.record_type}
              </span>
              <span className="truncate max-w-[180px]">{record.label}</span>
              <button
                type="button"
                onClick={() => removeRecord(index)}
                className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove ${record.label}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
