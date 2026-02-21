import { useRef, useState } from "react";

interface NewFolderDialogProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function NewFolderDialog({ onSubmit, onCancel }: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  const handleSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#143A23] bg-white px-3 py-2 shadow-sm">
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
