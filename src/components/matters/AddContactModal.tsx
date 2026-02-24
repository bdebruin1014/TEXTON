import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ContactSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contactId: string, role: string, isPrimary: boolean) => void;
  isPending?: boolean;
}

export function AddContactModal({ isOpen, onClose, onAdd, isPending }: AddContactModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactSearchResult | null>(null);
  const [role, setRole] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setResults([]);
      setSelectedContact(null);
      setRole("");
      setIsPrimary(false);
    }
  }, [isOpen]);

  const searchContacts = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone")
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10);
      if (error) throw error;
      setResults((data ?? []) as ContactSearchResult[]);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchContacts(value), 300);
    },
    [searchContacts],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!selectedContact || !role.trim()) return;
    onAdd(selectedContact.id, role.trim(), isPrimary);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close modal" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Add Contact</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Contact search */}
        {!selectedContact ? (
          <div>
            <label htmlFor="contact-search" className="mb-1 block text-sm font-medium text-foreground">
              Search Contacts
            </label>
            <input
              id="contact-search"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Type a name or email..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />

            {isSearching && <p className="mt-2 text-xs text-muted-foreground">Searching...</p>}

            {results.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
                {results.map((c) => {
                  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unnamed";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedContact(c);
                        setResults([]);
                        setSearchTerm("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium text-foreground">{name}</div>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {searchTerm.length >= 2 && !isSearching && results.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No contacts found</p>
            )}
          </div>
        ) : (
          <div>
            {/* Selected contact */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {`${selectedContact.first_name ?? ""} ${selectedContact.last_name ?? ""}`.trim() || "Unnamed"}
                </div>
                {selectedContact.email && <div className="text-xs text-muted-foreground">{selectedContact.email}</div>}
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            </div>

            {/* Role */}
            <div className="mb-3 space-y-1">
              <label htmlFor="contact-role" className="text-sm font-medium text-foreground">
                Role *
              </label>
              <input
                id="contact-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Attorney, Broker, Consultant..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Is Primary */}
            <label className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Primary contact for this matter</span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!role.trim() || isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Contact"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
