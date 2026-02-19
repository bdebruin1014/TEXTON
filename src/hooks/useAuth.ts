import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, session, isLoading, setAuth, clear } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setAuth(s?.user ?? null, s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuth(s?.user ?? null, s);
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  return { user, session, isLoading, signIn, signOut };
}
