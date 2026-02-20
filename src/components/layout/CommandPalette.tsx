import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { NAV_MODULES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useUiStore } from "@/stores/uiStore";

interface SearchResult {
  id: string;
  label: string;
  type: string;
  path: string;
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Reset search on close
  useEffect(() => {
    if (!commandPaletteOpen) setSearch("");
  }, [commandPaletteOpen]);

  const { data: records = [] } = useQuery<SearchResult[]>({
    queryKey: ["command-palette-search", search],
    enabled: commandPaletteOpen && search.length >= 2,
    queryFn: async () => {
      const results: SearchResult[] = [];
      const term = `%${search}%`;

      const [opps, projects, jobs, dispositions, companies] = await Promise.all([
        supabase.from("opportunities").select("id, opportunity_name").ilike("opportunity_name", term).limit(5),
        supabase.from("projects").select("id, project_name").ilike("project_name", term).limit(5),
        supabase.from("jobs").select("id, job_name").ilike("job_name", term).limit(5),
        supabase.from("dispositions").select("id, buyer_name").ilike("buyer_name", term).limit(5),
        supabase.from("companies").select("id, name").ilike("name", term).limit(5),
      ]);

      for (const opp of opps.data ?? []) {
        results.push({
          id: opp.id,
          label: opp.opportunity_name,
          type: "Opportunity",
          path: `/pipeline/${opp.id}/basic-info`,
        });
      }
      for (const proj of projects.data ?? []) {
        results.push({
          id: proj.id,
          label: proj.project_name,
          type: "Project",
          path: `/projects/${proj.id}/basic-info`,
        });
      }
      for (const job of jobs.data ?? []) {
        results.push({
          id: job.id,
          label: job.job_name,
          type: "Job",
          path: `/construction/${job.id}/job-info`,
        });
      }
      for (const dispo of dispositions.data ?? []) {
        results.push({
          id: dispo.id,
          label: dispo.buyer_name,
          type: "Disposition",
          path: `/disposition/${dispo.id}/overview`,
        });
      }
      for (const company of companies.data ?? []) {
        results.push({
          id: company.id,
          label: company.name,
          type: "Contact",
          path: `/contacts/${company.id}`,
        });
      }

      return results;
    },
    staleTime: 5000,
  });

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        onClick={() => setCommandPaletteOpen(false)}
        aria-label="Close command palette"
      />

      {/* Dialog */}
      <Command
        role="dialog"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") setCommandPaletteOpen(false);
        }}
      >
        <Command.Input
          placeholder="Search modules, projects, contacts..."
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
          value={search}
          onValueChange={setSearch}
        />
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted">No results found.</Command.Empty>

          <Command.Group heading="Modules" className="px-2 py-1.5 text-xs font-semibold text-muted">
            {NAV_MODULES.filter((m) => !("disabled" in m && m.disabled)).map((mod) => (
              <Command.Item
                key={mod.path}
                value={mod.label}
                onSelect={() => {
                  navigate({ to: mod.path });
                  setCommandPaletteOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-primary-50"
              >
                {mod.label}
              </Command.Item>
            ))}
          </Command.Group>

          {records.length > 0 && (
            <Command.Group heading="Records" className="px-2 py-1.5 text-xs font-semibold text-muted">
              {records.map((record) => (
                <Command.Item
                  key={`${record.type}-${record.id}`}
                  value={`${record.label} ${record.type}`}
                  onSelect={() => {
                    navigate({ to: record.path as string });
                    setCommandPaletteOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-primary-50"
                >
                  <span>{record.label}</span>
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {record.type}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
