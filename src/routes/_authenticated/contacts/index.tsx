import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/contacts/")({
  component: CompaniesIndex,
});

interface Company {
  id: string;
  name: string;
  company_type: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  contact_count: number | null;
}

const COMPANY_TYPES = [
  "Subcontractor",
  "Lender",
  "Law Firm",
  "Title Company",
  "Surveyor",
  "Appraiser",
  "Real Estate Brokerage",
  "Insurance",
  "Utility Provider",
  "Material Supplier",
  "Government",
  "Other",
] as const;

function CompaniesIndex() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(COMPANY_TYPES));

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, company_type, phone, email, city, state, contact_count")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCompany = useMutation({
    mutationFn: async (companyType: string) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: `New ${companyType}`,
          company_type: companyType,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (data?.id) {
        navigate({ to: `/contacts/${data.id}` as string });
      }
    },
  });

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const companiesByType = COMPANY_TYPES.map((type) => ({
    type,
    companies: companies.filter((c) => c.company_type === type),
  }));

  const uncategorized = companies.filter(
    (c) => !c.company_type || !COMPANY_TYPES.includes(c.company_type as (typeof COMPANY_TYPES)[number]),
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Companies</h1>
          <p className="mt-0.5 text-sm text-muted">{companies.length} companies organized by type</p>
        </div>
        <button
          type="button"
          onClick={() => addCompany.mutate("Other")}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : companies.length === 0 ? (
        <EmptyState title="No companies" description="Add companies to build your contacts directory" />
      ) : (
        <div className="space-y-2">
          {companiesByType.map(({ type, companies: typeCompanies }) => {
            if (typeCompanies.length === 0) return null;
            const isExpanded = expandedTypes.has(type);
            return (
              <div key={type} className="rounded-lg border border-border bg-card">
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleType(type)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted" />
                    )}
                    <span className="text-sm font-semibold text-foreground">{type}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {typeCompanies.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addCompany.mutate(type);
                    }}
                    className="rounded p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </button>

                {/* Expanded Company List */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {typeCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => navigate({ to: `/contacts/${company.id}` as string })}
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-muted" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground">{company.name}</span>
                          {(company.city || company.state) && (
                            <span className="ml-2 text-xs text-muted">
                              {[company.city, company.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                        {company.phone && <span className="text-xs text-muted">{company.phone}</span>}
                        {company.contact_count != null && company.contact_count > 0 && (
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-muted">
                            {company.contact_count} contact{company.contact_count === 1 ? "" : "s"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3">
                <span className="text-sm font-semibold text-muted">Uncategorized</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                  {uncategorized.length}
                </span>
              </div>
              <div className="border-t border-border">
                {uncategorized.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => navigate({ to: `/contacts/${company.id}` as string })}
                    className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted" />
                    <span className="text-sm font-medium text-foreground">{company.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
