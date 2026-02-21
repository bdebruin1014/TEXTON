import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Contact {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
}

interface ContactSearchInputProps {
  onSelect: (contact: Contact) => void;
  selectedContact: Contact | null;
  onClear: () => void;
}

export function ContactSearchInput({ onSelect, selectedContact, onClear }: ContactSearchInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-search", query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, company_name")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(8);
      if (error) throw error;
      return data as Contact[];
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    if (contacts.length > 0 && query.length >= 2) setOpen(true);
    else setOpen(false);
  }, [contacts, query]);

  if (selectedContact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{selectedContact.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {selectedContact.email}
            {selectedContact.company_name && ` · ${selectedContact.company_name}`}
          </div>
        </div>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center rounded-md border border-border bg-white px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => contacts.length > 0 && setOpen(true)}
          placeholder="Search contacts..."
          className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onSelect(contact);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-accent/50"
              >
                <div className="text-sm font-medium text-foreground">{contact.name}</div>
                <div className="text-xs text-muted-foreground">
                  {contact.email}
                  {contact.company_name && ` · ${contact.company_name}`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
