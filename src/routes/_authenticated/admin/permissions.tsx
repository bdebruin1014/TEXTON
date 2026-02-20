import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  component: Permissions,
});

interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: string[] | null;
  member_count: number | null;
}

function Permissions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery<PermissionGroup[]>({
    queryKey: ["permission-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permission_groups").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("permission_groups").insert({
        name: `Group ${groups.length + 1}`,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permission-groups"] }),
  });

  const activeGroup = groups.find((g) => g.id === activeTab) ?? groups[0];

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Permission Groups</h1>
          <p className="mt-0.5 text-sm text-muted">Qualia-style permission configuration</p>
        </div>
        <button
          type="button"
          onClick={() => addGroup.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          Add Permission Group
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No permission groups" description="Create groups to manage user access permissions" />
      ) : (
        <div>
          {/* Tab Bar */}
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTab(group.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === group.id || (!activeTab && group === groups[0])
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          {/* Active Group Detail */}
          {activeGroup && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{activeGroup.name}</h3>
                  <p className="text-xs text-muted">{activeGroup.description ?? "No description"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    
                    {activeGroup.member_count ?? 0} members
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
                  >
                    +
                    Add User
                  </button>
                </div>
              </div>

              {/* Permissions grid */}
              <div className="mt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Permissions</h4>
                {activeGroup.permissions && activeGroup.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeGroup.permissions.map((perm) => (
                      <span key={perm} className="rounded bg-accent px-2 py-1 text-xs font-medium">
                        {perm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No permissions configured</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
