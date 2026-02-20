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

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    const { error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  return { user, session, isLoading, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, updateProfile };
}
