import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CostBookFees } from "@/components/cost-books/CostBookFees";
import { CostBookLineItems } from "@/components/cost-books/CostBookLineItems";
import { CostBookPlanTable } from "@/components/cost-books/CostBookPlanTable";
import { CostBookSiteWork } from "@/components/cost-books/CostBookSiteWork";
import { CostBookUpgrades } from "@/components/cost-books/CostBookUpgrades";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { useCloneCostBook, useCostBook } from "@/hooks/useCostBooks";
import { STATUS_COLORS } from "@/lib/constants";
import { Sentry } from "@/lib/sentry";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/cost-books/$bookId")({
  component: CostBookDetail,
});

const STATUS_OPTIONS = ["Draft", "Active", "Archived"];

function CostBookDetail() {
  const { bookId } = Route.useParams();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["cost-book", bookId], [bookId]);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: book, isLoading } = useCostBook(bookId);
  const cloneBook = useCloneCostBook();

  // Line items drill-down state
  const [lineItemView, setLineItemView] = useState<{ planId: string; planName: string } | null>(null);

  // Clone dialog state
  const [showClone, setShowClone] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDate, setCloneDate] = useState("");

  const saveTextField = useCallback(
    (field: string, value: string) => {
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
      debounceTimers.current[field] = setTimeout(async () => {
        const { error } = await supabase
          .from("cost_books")
          .update({ [field]: value })
          .eq("id", bookId);
        if (error) Sentry.captureException(error);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [bookId, queryClient, queryKey],
  );

  const saveSelectField = useCallback(
    async (field: string, value: string | boolean) => {
      const { error } = await supabase
        .from("cost_books")
        .update({ [field]: value })
        .eq("id", bookId);
      if (error) Sentry.captureException(error);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["cost-books"] });
    },
    [bookId, queryClient, queryKey],
  );

  const handleClone = useCallback(async () => {
    if (!cloneName.trim()) return;
    await cloneBook.mutateAsync({
      sourceId: bookId,
      name: cloneName,
      effectiveDate: cloneDate || undefined,
    });
    setShowClone(false);
    setCloneName("");
    setCloneDate("");
  }, [bookId, cloneName, cloneDate, cloneBook]);

  if (isLoading || !book) {
    return <FormSkeleton />;
  }

  const statusColors = STATUS_COLORS[book.status] ?? { bg: "bg-accent", text: "text-muted-foreground" };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/cost-books"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"\u2190"} Back to Cost Books
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{book.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
            {book.status}
          </span>
          {book.is_default && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Default</span>
          )}
        </div>
      </div>

      {/* Active warning banner */}
      {book.status === "Active" && (
        <div className="mb-6 rounded-lg border border-warning-bg bg-warning-bg/30 px-4 py-3">
          <p className="text-sm text-warning-text">
            This cost book is <strong>Active</strong>. Edits will affect all new deals that reference this book.
          </p>
        </div>
      )}

      {/* Editable Header Fields */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cost Book Details</h2>
          <button
            type="button"
            onClick={() => {
              setCloneName(`${book.name} (Copy)`);
              setCloneDate(new Date().toISOString().split("T")[0] ?? "");
              setShowClone(true);
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Clone Cost Book
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Name */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Name</span>
            <input
              type="text"
              defaultValue={book.name}
              onChange={(e) => saveTextField("name", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Effective Date</span>
            <input
              type="date"
              defaultValue={book.effective_date ?? ""}
              onChange={(e) => saveTextField("effective_date", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Status</span>
            <select
              defaultValue={book.status}
              onChange={(e) => saveSelectField("status", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Default */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Default</span>
            <label className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                checked={book.is_default}
                onChange={(e) => saveSelectField("is_default", e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Auto-select for new deals</span>
            </label>
          </div>

          {/* Description (spans 2 cols) */}
          <div className="space-y-1.5 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Description</span>
            <input
              type="text"
              defaultValue={book.description ?? ""}
              onChange={(e) => saveTextField("description", e.target.value)}
              placeholder="Optional description of this pricing vintage..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Clone Dialog */}
      {showClone && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Clone Cost Book</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">New Name</span>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Effective Date</span>
              <input
                type="date"
                value={cloneDate}
                onChange={(e) => setCloneDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleClone}
                disabled={cloneBook.isPending}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
              >
                {cloneBook.isPending ? "Cloning..." : "Create Clone"}
              </button>
              <button
                type="button"
                onClick={() => setShowClone(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans Section */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Plan Pricing</h2>
        {lineItemView ? (
          <CostBookLineItems
            bookId={bookId}
            planId={lineItemView.planId}
            planName={lineItemView.planName}
            onBack={() => setLineItemView(null)}
          />
        ) : (
          <CostBookPlanTable
            bookId={bookId}
            onViewLineItems={(planId, planName) => setLineItemView({ planId, planName })}
          />
        )}
      </div>

      {/* Upgrades Section */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Upgrade Packages</h2>
        <CostBookUpgrades bookId={bookId} />
      </div>

      {/* Site Work Section */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Site Work</h2>
        <CostBookSiteWork bookId={bookId} />
      </div>

      {/* Fees Section */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Fee Schedule Overrides</h2>
        <CostBookFees bookId={bookId} />
      </div>
    </div>
  );
}
