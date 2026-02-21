import { createFileRoute, Link, Outlet, useMatches, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { COMPANY_TYPE_CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsLayout,
});

function ContactsLayout() {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.fullPath ?? "";
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  // Read active company type filter from search params (only on companies page)
  const isCompaniesPage =
    currentPath === "/contacts" || currentPath === "/contacts/" || currentPath.startsWith("/contacts?");
  const activeType = isCompaniesPage ? ((location.search as Record<string, string>)?.type ?? "all") : undefined;

  // Expand/collapse state for category parents — independent of filter
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const setFilter = (type: string) => {
    navigate({ to: "/contacts", search: type === "all" ? {} : { type } });
  };

  // Check if a category is active (any of its types match the filter)
  const isCategoryActive = (category: (typeof COMPANY_TYPE_CATEGORIES)[number]) => {
    if (activeType === category.label) return true;
    return category.types.some((t) => t === activeType);
  };

  const isCompanyDetail =
    currentPath.startsWith("/contacts/") &&
    !currentPath.startsWith("/contacts/employees") &&
    !currentPath.startsWith("/contacts/customers");
  const isEmployees = currentPath === "/contacts/employees" || currentPath.startsWith("/contacts/employees/");
  const isCustomers = currentPath === "/contacts/customers" || currentPath.startsWith("/contacts/customers/");

  const sidebar = (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <span className="text-sm font-semibold text-white">Contacts</span>
        <p className="text-[10px]" style={{ color: "var(--sidebar-heading)" }}>
          People & companies directory
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        {/* COMPANIES — top level */}
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="flex w-full items-center justify-between py-[7px] pl-4 pr-4 text-left text-[13px] transition-colors"
          style={{
            borderLeft:
              isCompaniesPage || isCompanyDetail
                ? activeType === "all" || !isCompaniesPage
                  ? "3px solid var(--sidebar-active-border)"
                  : "3px solid transparent"
                : "3px solid transparent",
            backgroundColor:
              (isCompaniesPage && activeType === "all") || isCompanyDetail ? "var(--sidebar-active-bg)" : undefined,
            color:
              (isCompaniesPage && activeType === "all") || isCompanyDetail
                ? "var(--sidebar-active-text)"
                : "var(--sidebar-text)",
            fontWeight: isCompaniesPage || isCompanyDetail ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!(isCompaniesPage && activeType === "all") && !isCompanyDetail) {
              e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!(isCompaniesPage && activeType === "all") && !isCompanyDetail) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          Companies
        </button>

        {/* Company type categories */}
        {COMPANY_TYPE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.label);
          const catActive = isCompaniesPage && isCategoryActive(category);
          const parentActive = isCompaniesPage && activeType === category.label;

          return (
            <div key={category.label}>
              {/* Category parent row */}
              <div className="flex items-center">
                {/* Expand/collapse toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(category.label);
                  }}
                  className="flex items-center justify-center py-[7px] pl-4 pr-1"
                  style={{ color: "var(--sidebar-heading)" }}
                >
                  <span className="text-[10px] leading-none">{isExpanded ? "\u25BE" : "\u25B8"}</span>
                </button>

                {/* Category label — clicks to filter */}
                <button
                  type="button"
                  onClick={() => setFilter(category.label)}
                  className="flex-1 py-[7px] pr-4 text-left text-[13px] transition-colors"
                  style={{
                    color: parentActive
                      ? "var(--sidebar-active-text)"
                      : catActive
                        ? "var(--sidebar-active-text)"
                        : "var(--sidebar-text)",
                    fontWeight: parentActive ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!parentActive) e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    if (!parentActive) {
                      e.currentTarget.style.color = catActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)";
                    }
                  }}
                >
                  {category.label}
                </button>
              </div>

              {/* Expanded children — specific types */}
              {isExpanded &&
                category.types.map((type) => {
                  const typeActive = isCompaniesPage && activeType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilter(type)}
                      className="flex w-full items-center py-[6px] pl-10 pr-4 text-left text-[12px] transition-colors"
                      style={{
                        borderLeft: typeActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                        backgroundColor: typeActive ? "var(--sidebar-active-bg)" : undefined,
                        color: typeActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                        fontWeight: typeActive ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!typeActive) {
                          e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
                          e.currentTarget.style.color = "#FFFFFF";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!typeActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--sidebar-text)";
                        }
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
            </div>
          );
        })}

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ backgroundColor: "var(--sidebar-border)" }} />

        {/* EMPLOYEES */}
        <Link
          to="/contacts/employees"
          className="flex w-full items-center py-[7px] pl-4 pr-4 text-[13px] transition-colors"
          style={{
            borderLeft: isEmployees ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
            backgroundColor: isEmployees ? "var(--sidebar-active-bg)" : undefined,
            color: isEmployees ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
            fontWeight: isEmployees ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!isEmployees) {
              e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isEmployees) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          Employees
        </Link>

        {/* CUSTOMERS */}
        <Link
          to="/contacts/customers"
          className="flex w-full items-center py-[7px] pl-4 pr-4 text-[13px] transition-colors"
          style={{
            borderLeft: isCustomers ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
            backgroundColor: isCustomers ? "var(--sidebar-active-bg)" : undefined,
            color: isCustomers ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
            fontWeight: isCustomers ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!isCustomers) {
              e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isCustomers) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          Customers
        </Link>
      </nav>
    </aside>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}
