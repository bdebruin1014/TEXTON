import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SearchResult {
  record_type: string;
  record_id: string;
  label: string;
}

interface GroupedResults {
  [key: string]: SearchResult[];
}

interface LinkRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (recordType: string, recordId: string, description: string) => void;
  isPending?: boolean;
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
  contact: "bg-green-100 text-green-700",
  entity: "bg-purple-100 text-purple-700",
};

export function LinkRecordModal({ isOpen, onClose, onLink, isPending }: LinkRecordModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SearchResult | null>(null);
  const [description, setDescription] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setResults([]);
      setSelectedRecord(null);
      setDescription("");
    }
  }, [isOpen]);

  const searchRecords = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!selectedRecord) return;
    onLink(selectedRecord.record_type, selectedRecord.record_id, description.trim());
  };

  if (!isOpen) return null;

  // Group results by type
  const grouped: GroupedResults = {};
  for (const r of results) {
    if (!grouped[r.record_type]) grouped[r.record_type] = [];
    (grouped[r.record_type] as SearchResult[]).push(r);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close modal" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Link Record</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            x
          </button>
        </div>

        {!selectedRecord ? (
          <div>
            <label htmlFor="link-record-search" className="mb-1 block text-sm font-medium text-foreground">
              Search Records
            </label>
            <input
              id="link-record-search"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search projects, contacts, entities..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />

            {isSearching && <p className="mt-2 text-xs text-muted-foreground">Searching...</p>}

            {Object.keys(grouped).length > 0 && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
                {Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="bg-accent/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[type] ?? type}
                    </div>
                    {items.map((item) => (
                      <button
                        key={`${item.record_type}-${item.record_id}`}
                        type="button"
                        onClick={() => {
                          setSelectedRecord(item);
                          setResults([]);
                          setSearchTerm("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="truncate flex-1 text-foreground">{item.label}</span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[item.record_type] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {item.record_type}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && !isSearching && results.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No records found</p>
            )}
          </div>
        ) : (
          <div>
            {/* Selected record */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[selectedRecord.record_type] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {selectedRecord.record_type}
                </span>
                <span className="text-sm font-medium text-foreground">{selectedRecord.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            </div>

            {/* Description */}
            <div className="mb-4 space-y-1">
              <label htmlFor="link-record-desc" className="text-sm font-medium text-foreground">
                Relationship Description
              </label>
              <input
                id="link-record-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Related project, Primary lender..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Linking..." : "Link Record"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
