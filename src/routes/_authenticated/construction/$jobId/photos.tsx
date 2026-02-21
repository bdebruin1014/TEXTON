import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useRef } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/photos")({
  component: Photos,
});

interface Photo {
  id: string;
  file_name: string;
  storage_path: string | null;
  caption: string | null;
  phase: string | null;
  created_at: string;
}

function Photos() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["job-photos", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_photos")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadPhotos = useMutation({
    mutationFn: async (file: File) => {
      const path = `jobs/${jobId}/photos/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("job_photos").insert({
        job_id: jobId,
        file_name: file.name,
        storage_path: path,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-photos", jobId] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: Photo) => {
      if (photo.storage_path) {
        await supabase.storage.from("photos").remove([photo.storage_path]);
      }
      const { error } = await supabase.from("job_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-photos", jobId] }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      uploadPhotos.mutate(file);
    }
    e.target.value = "";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Photos</h2>
          {photos.length > 0 && <p className="mt-0.5 text-sm text-muted">{photos.length} photos</p>}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
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

      {isLoading ? (
        <FormSkeleton />
      ) : photos.length === 0 ? (
        <EmptyState
          title="No photos"
          description="Upload construction progress photos"
          action={
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              Upload Photos
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex aspect-square items-center justify-center bg-card-hover"></div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-foreground">{photo.file_name}</p>
                <p className="text-[10px] text-muted">{formatDate(photo.created_at)}</p>
                {photo.caption && <p className="mt-0.5 truncate text-[10px] text-muted">{photo.caption}</p>}
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
  );
}
