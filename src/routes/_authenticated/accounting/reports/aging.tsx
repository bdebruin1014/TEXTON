import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/aging")({
  component: AgingReport,
});

interface AgingBucket {
  name: string;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  total: number;
}

function bucketize(items: Array<{ due_date: string | null; amount: number | null; received?: number }>) {
  const now = new Date();
  let current = 0;
  let days30 = 0;
  let days60 = 0;
  let days90plus = 0;

  for (const item of items) {
    const outstanding = (item.amount ?? 0) - (item.received ?? 0);
    if (outstanding <= 0) continue;
    if (!item.due_date) {
      current += outstanding;
      continue;
    }
    const due = new Date(item.due_date);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) current += outstanding;
    else if (daysOverdue <= 30) days30 += outstanding;
    else if (daysOverdue <= 60) days60 += outstanding;
    else days90plus += outstanding;
  }

  return { current, days30, days60, days90plus, total: current + days30 + days60 + days90plus };
}

function AgingReport() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [tab, setTab] = useState<"AP" | "AR">("AP");

  const { data: bills = [], isLoading: loadingBills } = useQuery({
    queryKey: ["aging-bills", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("bills")
        .select("id, vendor_name, due_date, amount, paid_amount, status")
        .not("status", "in", '("Paid","Void")');
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: receivables = [], isLoading: loadingAR } = useQuery({
    queryKey: ["aging-receivables", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("receivables")
        .select("id, customer_name, due_date, amount, received_amount, status")
        .not("status", "in", '("Collected","Write-Off")');
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Group bills by vendor
  const apByVendor = new Map<string, Array<{ due_date: string | null; amount: number | null; received: number }>>();
  for (const bill of bills) {
    const vendor = bill.vendor_name ?? "Unknown";
    if (!apByVendor.has(vendor)) apByVendor.set(vendor, []);
    apByVendor.get(vendor)!.push({
      due_date: bill.due_date,
      amount: bill.amount,
      received: bill.paid_amount ?? 0,
    });
  }
  const apBuckets: AgingBucket[] = Array.from(apByVendor.entries()).map(([name, items]) => ({
    name,
    ...bucketize(items),
  }));

  // Group receivables by customer
  const arByCustomer = new Map<string, Array<{ due_date: string | null; amount: number | null; received: number }>>();
  for (const rec of receivables) {
    const customer = rec.customer_name ?? "Unknown";
    if (!arByCustomer.has(customer)) arByCustomer.set(customer, []);
    arByCustomer.get(customer)!.push({
      due_date: rec.due_date,
      amount: rec.amount,
      received: rec.received_amount ?? 0,
    });
  }
  const arBuckets: AgingBucket[] = Array.from(arByCustomer.entries()).map(([name, items]) => ({
    name,
    ...bucketize(items),
  }));

  const buckets = tab === "AP" ? apBuckets : arBuckets;
  const isLoading = tab === "AP" ? loadingBills : loadingAR;
  const totals = buckets.reduce(
    (acc, b) => ({
      current: acc.current + b.current,
      days30: acc.days30 + b.days30,
      days60: acc.days60 + b.days60,
      days90plus: acc.days90plus + b.days90plus,
      total: acc.total + b.total,
    }),
    { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 },
  );

  return (
    <div>
      <div className="mb-6">
        <Link to="/accounting/reports" className="mb-2 inline-block text-xs font-medium text-primary hover:underline">
          &larr; Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Aging Report</h1>
        <div className="mt-3 flex gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setTab("AP")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "AP" ? "bg-button text-white" : "text-muted hover:text-foreground"}`}
          >
            Accounts Payable
          </button>
          <button
            type="button"
            onClick={() => setTab("AR")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "AR" ? "bg-button text-white" : "text-muted hover:text-foreground"}`}
          >
            Accounts Receivable
          </button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : buckets.length === 0 ? (
        <EmptyState
          title={`No outstanding ${tab === "AP" ? "payables" : "receivables"}`}
          description={`No open ${tab === "AP" ? "bills" : "receivables"} to age`}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3 font-medium">{tab === "AP" ? "Vendor" : "Customer"}</th>
                <th className="p-3 text-right font-medium">Current</th>
                <th className="p-3 text-right font-medium">1-30 Days</th>
                <th className="p-3 text-right font-medium">31-60 Days</th>
                <th className="p-3 text-right font-medium">90+ Days</th>
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {buckets
                .sort((a, b) => b.total - a.total)
                .map((bucket) => (
                  <tr key={bucket.name} className="border-b border-border/50">
                    <td className="p-3 font-medium">{bucket.name}</td>
                    <td className="p-3 text-right">{bucket.current ? formatCurrency(bucket.current) : "—"}</td>
                    <td className="p-3 text-right">{bucket.days30 ? formatCurrency(bucket.days30) : "—"}</td>
                    <td className="p-3 text-right">{bucket.days60 ? formatCurrency(bucket.days60) : "—"}</td>
                    <td className="p-3 text-right text-destructive">
                      {bucket.days90plus ? formatCurrency(bucket.days90plus) : "—"}
                    </td>
                    <td className="p-3 text-right font-medium">{formatCurrency(bucket.total)}</td>
                  </tr>
                ))}
              <tr className="bg-card-hover font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right">{formatCurrency(totals.current)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.days30)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.days60)}</td>
                <td className="p-3 text-right text-destructive">{formatCurrency(totals.days90plus)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
