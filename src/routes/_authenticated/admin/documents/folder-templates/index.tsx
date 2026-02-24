import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/documents/folder-templates/")({
  component: FolderTemplateList,
});

interface FolderTemplate {
  id: string;
  name: string;
  record_type: string;
  project_type: string | null;
  is_default: boolean;
  is_active: boolean;
}

const TABS = [
  { label: "All", value: "all" },
  { label: "Projects", value: "project" },
  { label: "Jobs", value: "job" },
  { label: "Dispositions", value: "disposition" },
  { label: "Opportunities", value: "opportunity" },
] as const;

const RECORD_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  job: "Job",
  disposition: "Disposition",
  opportunity: "Opportunity",
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  scattered_lot: "Scattered Lot",
  community_dev: "Community Dev",
  lot_dev: "Lot Dev",
  lot_purchase: "Lot Purchase",
};

function FolderTemplateList() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: templates = [], isLoading } = useQuery<FolderTemplate[]>({
    queryKey: ["folder-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folder_templates")
        .select("*")
        .eq("is_active", true)
        .order("record_type")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = activeTab === "all" ? templates : templates.filter((t) => t.record_type === activeTab);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Folder Templates</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure default folder structures for projects, jobs, and dispositions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="No folder templates" description="Create templates to auto-generate folder structures" />
      ) : (
        <div className="rounded-lg border border-border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Record Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((template) => (
                <tr key={template.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/documents/folder-templates/${template.id}` as string}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {template.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {RECORD_TYPE_LABELS[template.record_type] ?? template.record_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {template.project_type
                      ? (PROJECT_TYPE_LABELS[template.project_type] ?? template.project_type)
                      : "All"}
                  </td>
                  <td className="px-4 py-3">
                    {template.is_default && (
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Default
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
