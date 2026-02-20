import { FolderPlus } from "lucide-react";
import { useRef, useState } from "react";

interface NewFolderDialogProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function NewFolderDialog({ onSubmit, onCancel }: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#1B3022] bg-white px-3 py-2 shadow-sm">
      <FolderPlus className="h-4 w-4 shrink-0 text-[#1B3022]" />
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleSubmit}
        placeholder="New folder name"
        className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
