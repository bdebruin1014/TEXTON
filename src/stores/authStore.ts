import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setAuth: (user, session) => set({ user, session, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, session: null, isLoading: false }),
}));
