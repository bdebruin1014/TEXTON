import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/coa-templates/new")({
  component: ImportCOATemplate,
});

const ENTITY_TYPE_OPTIONS = [
  { label: "Operating Company", value: "operating" },
  { label: "Holding Company", value: "holding_company" },
  { label: "Investment Fund", value: "fund" },
  { label: "SPE - Development", value: "spe_development" },
  { label: "SPE - Rental", value: "spe_rental" },
  { label: "Property Management", value: "property_management" },
  { label: "SPE - Scattered Lot", value: "spe_scattered_lot" },
  { label: "SPE - Community Dev", value: "spe_community_dev" },
  { label: "SPE - Lot Dev", value: "spe_lot_dev" },
  { label: "SPE - Lot Purchase", value: "spe_lot_purchase" },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ImportCOATemplate() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !name) throw new Error("File and name are required");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("description", description);
      formData.append("entity_types", entityTypes.join(","));
      formData.append("is_default", String(isDefault));

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-coa-template`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Template imported: ${data.accounts_imported} accounts`);
      navigate({ to: "/admin/coa-templates/$templateId", params: { templateId: data.template_id } });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const toggleEntityType = (value: string) => {
    setEntityTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/coa-templates"
          className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          {"<-"} All Templates
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Import COA Template</h1>
        <p className="mt-0.5 text-sm text-muted">
          Upload an Excel file (.xlsx) containing a chart of accounts to create a new template.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* File Upload */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Excel File</h3>
          <div
            className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-accent/30"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click to select .xlsx file</p>
                <p className="mt-1 text-xs text-muted">First 4 rows will be skipped as headers</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                if (!name) handleNameChange(f.name.replace(/\.(xlsx|xls)$/, "").replace(/[_-]+/g, " "));
              }
            }}
          />
        </div>

        {/* Template Details */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Template Details</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Operating Homebuilder"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="auto-generated"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Entity Types */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Entity Types</h3>
          <div className="flex flex-wrap gap-2">
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleEntityType(opt.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  entityTypes.includes(opt.value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted hover:border-primary/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default Toggle */}
        <div className="rounded-lg border border-border bg-card p-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Set as default template</span>
              <p className="text-xs text-muted">Auto-selected when creating entities of these types</p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!file || !name || importMutation.isPending}
            onClick={() => importMutation.mutate()}
            className="rounded-lg bg-button px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {importMutation.isPending ? "Importing..." : "Import Template"}
          </button>
          <Link
            to="/admin/coa-templates"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
