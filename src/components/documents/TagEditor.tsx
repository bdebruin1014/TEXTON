import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface TagEditorProps {
  documentId: string;
  currentTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClose: () => void;
}

export function TagEditor({ documentId, currentTags, onTagsChange, onClose }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use a timeout so the initial click that opened the popover doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Query suggested tags from documents in the same context
  const { data: suggestedTags = [] } = useQuery({
    queryKey: ["document-suggested-tags", documentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("tags");

      if (error) throw error;

      // Collect all unique tags across documents
      const tagCounts = new Map<string, number>();
      for (const doc of data ?? []) {
        if (Array.isArray(doc.tags)) {
          for (const tag of doc.tags) {
            if (typeof tag === "string" && tag.trim()) {
              const normalized = tag.trim().toLowerCase();
              tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
            }
          }
        }
      }

      // Sort by frequency and return top suggestions
      return Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag)
        .slice(0, 20);
    },
  });

  // Mutation to update tags
  const updateTagsMutation = useMutation({
    mutationFn: async (newTags: string[]) => {
      const { error } = await supabase.from("documents").update({ tags: newTags }).eq("id", documentId);

      if (error) throw error;
      return newTags;
    },
    onSuccess: (newTags) => {
      onTagsChange(newTags);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim().toLowerCase();
      if (!trimmed || tags.includes(trimmed)) return;

      const newTags = [...tags, trimmed];
      setTags(newTags);
      updateTagsMutation.mutate(newTags);
    },
    [tags, updateTagsMutation],
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter((t) => t !== tagToRemove);
      setTags(newTags);
      updateTagsMutation.mutate(newTags);
    },
    [tags, updateTagsMutation],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        // Support comma-separated input
        const parts = inputValue.split(",");
        for (const part of parts) {
          addTag(part);
        }
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1] ?? "");
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If user types a comma, add the tag immediately
    if (value.includes(",")) {
      const parts = value.split(",");
      for (const part of parts.slice(0, -1)) {
        addTag(part);
      }
      setInputValue(parts[parts.length - 1] ?? "");
    } else {
      setInputValue(value);
    }
  };

  // Filter suggested tags to exclude already-applied tags
  const filteredSuggestions = suggestedTags.filter(
    (tag) => !tags.includes(tag) && (!inputValue || tag.includes(inputValue.toLowerCase())),
  );

  return (
    <div ref={containerRef} className="absolute z-50 w-72 rounded-lg border border-border bg-white shadow-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">Edit Tags</span>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {tags.length === 0 && <span className="text-xs text-gray-400 py-1">No tags yet</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-[#143A23] border border-green-200"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="p-0 text-green-600 hover:text-red-500 transition-colors"
              aria-label={`Remove tag ${tag}`}
            >
              <span className="text-xs leading-none">&times;</span>
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Add tag..."
        className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#143A23]/20 focus:border-[#143A23]"
      />

      {/* Suggested tags */}
      {filteredSuggestions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs text-gray-500 font-medium">Suggestions</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {filteredSuggestions.slice(0, 10).map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  addTag(tag);
                  setInputValue("");
                }}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs border transition-colors",
                  "bg-gray-50 text-gray-600 border-gray-200",
                  "hover:bg-green-50 hover:text-[#143A23] hover:border-green-200",
                )}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Done button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#143A23] text-white hover:bg-[#143A23]/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
