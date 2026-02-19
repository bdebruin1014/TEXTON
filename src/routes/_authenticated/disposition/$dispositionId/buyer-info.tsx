import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/buyer-info")({
  component: BuyerInfo,
});

function BuyerInfo() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: disposition, isLoading } = useQuery({
    queryKey: ["disposition", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositions").select("*").eq("id", dispositionId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("dispositions").update(updates).eq("id", dispositionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposition", dispositionId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!disposition) {
    return <div className="py-12 text-center text-sm text-muted">Disposition not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Buyer Information</h2>

      {/* Buyer Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Buyer Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Buyer Name"
            value={disposition.buyer_name}
            onSave={save("buyer_name")}
            placeholder="Full name"
          />
          <AutoSaveField
            label="Buyer Email"
            value={disposition.buyer_email}
            onSave={save("buyer_email")}
            type="email"
            placeholder="email@example.com"
          />
          <AutoSaveField
            label="Buyer Phone"
            value={disposition.buyer_phone}
            onSave={save("buyer_phone")}
            type="tel"
            placeholder="(555) 555-5555"
          />
          <AutoSaveField
            label="Buyer Address"
            value={disposition.buyer_address}
            onSave={save("buyer_address")}
            placeholder="Current address"
          />
        </div>
      </div>

      {/* Co-Buyer */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Co-Buyer</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Co-Buyer Name"
            value={disposition.co_buyer_name}
            onSave={save("co_buyer_name")}
            placeholder="Full name"
          />
          <AutoSaveField
            label="Co-Buyer Email"
            value={disposition.co_buyer_email}
            onSave={save("co_buyer_email")}
            type="email"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Buyer's Agent */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Buyer's Agent</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Agent Name"
            value={disposition.buyer_agent_name}
            onSave={save("buyer_agent_name")}
            placeholder="Agent name"
          />
          <AutoSaveField
            label="Agent Email"
            value={disposition.buyer_agent_email}
            onSave={save("buyer_agent_email")}
            type="email"
            placeholder="email@example.com"
          />
          <AutoSaveField
            label="Agent Phone"
            value={disposition.buyer_agent_phone}
            onSave={save("buyer_agent_phone")}
            type="tel"
            placeholder="(555) 555-5555"
          />
          <AutoSaveField
            label="Brokerage"
            value={disposition.buyer_agent_brokerage}
            onSave={save("buyer_agent_brokerage")}
            placeholder="Brokerage name"
          />
        </div>
      </div>

      {/* Pre-Approval */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Pre-Approval</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Pre-Approval Status"
            value={disposition.pre_approval_status}
            onSave={save("pre_approval_status")}
            options={["Not Submitted", "Submitted", "Approved", "Denied"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Lender Name"
            value={disposition.pre_approval_lender}
            onSave={save("pre_approval_lender")}
            placeholder="Lender name"
          />
          <AutoSaveField
            label="Pre-Approval Date"
            value={disposition.pre_approval_date}
            onSave={save("pre_approval_date")}
            type="date"
          />
          <AutoSaveField
            label="Pre-Approval Amount"
            value={disposition.pre_approval_amount}
            onSave={save("pre_approval_amount")}
            type="number"
            placeholder="Amount"
          />
        </div>
      </div>
    </div>
  );
}
