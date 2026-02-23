import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Sentry } from "@/lib/sentry";

interface FloorPlanImage {
  id: string;
  floor_plan_id: string;
  image_type: string;
  storage_path: string;
  is_primary: boolean;
  elevation_variant: string | null;
  display_order: number;
  caption: string | null;
}

const IMAGE_TYPES = [
  { value: "rendering", label: "Rendering" },
  { value: "floorplan", label: "Floor Plan" },
  { value: "elevation", label: "Elevation" },
  { value: "photo", label: "Photo" },
];

interface FloorPlanImagesProps {
  planId: string;
}

export function FloorPlanImages({ planId }: FloorPlanImagesProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState("rendering");
  const [uploading, setUploading] = useState(false);

  const queryKey = useMemo(() => ["floor-plan-images", planId], [planId]);

  const { data: images = [], isLoading } = useQuery<FloorPlanImage[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plan_images")
        .select("*")
        .eq("floor_plan_id", planId)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${planId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage.from("floor-plan-images").upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (uploadError) {
            Sentry.captureException(uploadError);
            continue;
          }

          const nextOrder = images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 1;
          const { error: insertError } = await supabase.from("floor_plan_images").insert({
            floor_plan_id: planId,
            image_type: uploadType,
            storage_path: path,
            is_primary: images.filter((i) => i.image_type === uploadType).length === 0,
            display_order: nextOrder,
          });
          if (insertError) Sentry.captureException(insertError);
        }
        queryClient.invalidateQueries({ queryKey });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [planId, uploadType, images, queryClient, queryKey],
  );

  const deleteImage = useMutation({
    mutationFn: async (image: FloorPlanImage) => {
      const { error: storageError } = await supabase.storage.from("floor-plan-images").remove([image.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("floor_plan_images").delete().eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: any) => toast.error(err?.message || "Failed to delete image"),
  });

  const togglePrimary = useMutation({
    mutationFn: async (image: FloorPlanImage) => {
      // Clear existing primary for this type
      await supabase
        .from("floor_plan_images")
        .update({ is_primary: false })
        .eq("floor_plan_id", planId)
        .eq("image_type", image.image_type)
        .eq("is_primary", true);
      // Set this one
      const { error } = await supabase.from("floor_plan_images").update({ is_primary: true }).eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("floor-plan-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>
        <div className="flex items-center gap-2">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            {IMAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-sm text-muted">Loading...</p>
      ) : images.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No images uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-lg border border-border">
              <img
                src={getPublicUrl(image.storage_path)}
                alt={image.caption ?? `${image.image_type} image`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {image.image_type}
                  </span>
                  {image.is_primary && <span className="text-xs text-[#C4841D]">&#9733;</span>}
                </div>
              </div>
              {/* Hover actions */}
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {!image.is_primary && (
                  <button
                    type="button"
                    onClick={() => togglePrimary.mutate(image)}
                    className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-black/80"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteImage.mutate(image)}
                  className="rounded bg-red-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
