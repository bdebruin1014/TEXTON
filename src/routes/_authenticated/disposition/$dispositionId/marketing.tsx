import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useRef } from "react";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/marketing")({
  component: Marketing,
});

interface ListingPhoto {
  id: string;
  file_name: string;
  storage_path: string | null;
  caption: string | null;
  sort_order: number | null;
  created_at: string;
}

function Marketing() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: disposition, isLoading } = useQuery({
    queryKey: ["disposition", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositions").select("*").eq("id", dispositionId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: photos = [] } = useQuery<ListingPhoto[]>({
    queryKey: ["listing-photos", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_photos")
        .select("*")
        .eq("disposition_id", dispositionId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
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

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const path = `dispositions/${dispositionId}/photos/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("listing_photos").insert({
        disposition_id: dispositionId,
        file_name: file.name,
        storage_path: path,
        sort_order: photos.length,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listing-photos", dispositionId] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: ListingPhoto) => {
      if (photo.storage_path) {
        await supabase.storage.from("photos").remove([photo.storage_path]);
      }
      const { error } = await supabase.from("listing_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listing-photos", dispositionId] }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      uploadPhoto.mutate(file);
    }
    e.target.value = "";
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!disposition) {
    return <div className="py-12 text-center text-sm text-muted">Disposition not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Marketing</h2>

      {/* Listing Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Listing Details</h3>
        <div className="grid grid-cols-1 gap-4">
          <AutoSaveField
            label="Marketing Description"
            value={disposition.marketing_description}
            onSave={save("marketing_description")}
            type="textarea"
            rows={4}
            placeholder="Property description for marketing..."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AutoSaveField
              label="Virtual Tour URL"
              value={disposition.virtual_tour_url}
              onSave={save("virtual_tour_url")}
              type="url"
              placeholder="https://..."
            />
            <AutoSaveField
              label="MLS Number"
              value={disposition.mls_number}
              onSave={save("mls_number")}
              placeholder="MLS #"
            />
            <AutoSaveField
              label="Listing Agent"
              value={disposition.listing_agent}
              onSave={save("listing_agent")}
              placeholder="Agent name"
            />
            <AutoSaveField
              label="Listing Brokerage"
              value={disposition.listing_brokerage}
              onSave={save("listing_brokerage")}
              placeholder="Brokerage name"
            />
          </div>
        </div>
      </div>

      {/* Syndication */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Syndication</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Zillow Link"
            value={disposition.zillow_url}
            onSave={save("zillow_url")}
            type="url"
            placeholder="https://..."
          />
          <AutoSaveField
            label="Realtor.com Link"
            value={disposition.realtor_url}
            onSave={save("realtor_url")}
            type="url"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Listing Photos</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
          >
            Upload Photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
            <p className="text-sm text-muted">No listing photos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card-hover"
              >
                <div className="flex aspect-square items-center justify-center"></div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-foreground">{photo.file_name}</p>
                  <p className="text-[10px] text-muted">{formatDate(photo.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deletePhoto.mutate(photo)}
                  className="absolute right-1 top-1 rounded bg-white/80 p-1 text-muted opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
