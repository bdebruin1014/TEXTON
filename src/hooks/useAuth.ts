import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useEntityStore } from "@/stores/entityStore";

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.");
}

function toAuthError(err: unknown): Error {
  if (isNetworkError(err)) {
    return new Error("Unable to reach the server. Please check your connection and try again.");
  }
  return err instanceof Error ? err : new Error(String(err));
}

export function useAuth() {
  const { user, session, isLoading, setAuth, clear } = useAuthStore();
  const { activeEntityId, setActiveEntity } = useEntityStore();

  useEffect(() => {
    const initSession = async (userId: string | undefined) => {
      if (!userId || activeEntityId) return;
      const { data } = await supabase.from("user_profiles").select("entity_id").eq("user_id", userId).single();
      if (data?.entity_id) {
        setActiveEntity(data.entity_id);
      }
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setAuth(s?.user ?? null, s);
      initSession(s?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuth(s?.user ?? null, s);
      initSession(s?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [setAuth, activeEntityId, setActiveEntity]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      throw toAuthError(err);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    } catch (err) {
      throw toAuthError(err);
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (err) {
      throw toAuthError(err);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (err) {
      throw toAuthError(err);
    }
  };

  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
    } catch (err) {
      throw toAuthError(err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  return { user, session, isLoading, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, updateProfile };
}
