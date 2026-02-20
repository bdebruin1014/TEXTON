import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { X, FileText, FileSpreadsheet, File, Search, Loader2, LayoutGrid, CheckCircle2 } from "lucide-react";

interface GenerateDocumentModalProps {
  recordType: string;
  recordId: string;
  folderId: string | null;
  onClose: () => void;
  onGenerated: () => void;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  file_type: string;
  template_content: string | null;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "docx":
      return <FileText className="h-8 w-8 text-blue-600" />;
    case "pdf":
      return <File className="h-8 w-8 text-red-600" />;
    case "xlsx":
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
}

function getFileTypeBadgeColor(fileType: string) {
  switch (fileType) {
    case "docx":
      return "bg-blue-100 text-blue-700";
    case "pdf":
      return "bg-red-100 text-red-700";
    case "xlsx":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function GenerateDocumentModal({
  recordType,
  recordId,
  folderId,
  onClose,
  onGenerated,
}: GenerateDocumentModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery<DocumentTemplate[]>({
    queryKey: ["document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_templates").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: template.name,
          file_type: template.file_type,
          record_type: recordType,
          record_id: recordId,
          folder_id: folderId,
          source: "generated",
          generated_from_template_id: templateId,
          status: "processing",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onGenerated();
      onClose();
    },
  });

  const filteredTemplates = templates.filter((template) => {
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description && template.description.toLowerCase().includes(query)) ||
      (template.category && template.category.toLowerCase().includes(query))
    );
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="rounded-xl bg-white shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-[#1B3022]" />
            <h2 className="text-lg font-semibold text-gray-900">Generate Document</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3022]/20 focus:border-[#1B3022]"
            />
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Loading templates...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <File className="h-8 w-8 mb-3" />
              <p className="text-sm text-red-500">Failed to load templates. Please try again.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="h-8 w-8 mb-3" />
              <p className="text-sm">
                {searchQuery ? "No templates match your search." : "No templates available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                      isSelected
                        ? "border-[#1B3022] bg-[#1B3022]/5 shadow-sm"
                        : "border-border bg-white hover:border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-[#1B3022]" />
                    )}
                    <div className="flex items-center gap-3">
                      {getFileIcon(template.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                        {template.category && (
                          <p className="text-xs text-gray-500 mt-0.5">{template.category}</p>
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase",
                        getFileTypeBadgeColor(template.file_type)
                      )}
                    >
                      {template.file_type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            {selectedTemplate ? (
              <span>
                Selected: <span className="font-medium text-gray-700">{selectedTemplate.name}</span>
              </span>
            ) : (
              <span>Select a template to generate</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedTemplateId || generateMutation.isPending}
              onClick={() => {
                if (selectedTemplateId) {
                  generateMutation.mutate(selectedTemplateId);
                }
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors flex items-center gap-2",
                selectedTemplateId && !generateMutation.isPending
                  ? "bg-[#1B3022] hover:bg-[#1B3022]/90 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Document
            </button>
          </div>
        </div>

        {/* Error message */}
        {generateMutation.isError && (
          <div className="px-6 pb-4 bg-gray-50 rounded-b-xl">
            <p className="text-sm text-red-600">
              Failed to generate document. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
