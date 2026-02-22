import { Link } from "@tanstack/react-router";

const PROFORMA_ROUTES: Record<string, { path: string; label: string }> = {
  "Community Development": { path: "/tools/community-proforma", label: "Community Development Proforma" },
  "Lot Development": { path: "/tools/lot-dev-proforma", label: "Lot Development Proforma" },
  "Lot Purchase": { path: "/tools/lot-purchase-proforma", label: "Lot Purchase Proforma" },
};

interface ComingSoonPlaceholderProps {
  projectType: string;
}

export function ComingSoonPlaceholder({ projectType }: ComingSoonPlaceholderProps) {
  const route = PROFORMA_ROUTES[projectType];

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
      <p className="text-sm font-medium text-foreground">{projectType} Deal Analyzer</p>
      {route ? (
        <>
          <p className="mt-1 text-xs text-muted">
            Use the {route.label} tool for this project type.
          </p>
          <Link
            to={route.path}
            className="mt-4 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            Open {route.label}
          </Link>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted">
          This analyzer is under development. The Scattered Lot analyzer is available now.
        </p>
      )}
    </div>
  );
}
