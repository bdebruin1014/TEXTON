import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useEntityStore } from "@/stores/entityStore";

/** Converts a raw network `TypeError: Failed to fetch` into a user-friendly Error. */
function wrapNetworkError(err: unknown): never {
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    throw new Error("Unable to reach the authentication service. Please check your connection.");
  }
  throw err;
}

export function useAuth() {
  const { user, session, isLoading, setAuth, clear } = useAuthStore();
  const { activeEntityId, setActiveEntity } = useEntityStore();

  useEffect(() => {
    const initSession = async (userId: string | undefined) => {
      if (!userId || activeEntityId) return;
      try {
        const { data } = await supabase.from("user_profiles").select("entity_id").eq("user_id", userId).single();
        if (data?.entity_id) {
          setActiveEntity(data.entity_id);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[useAuth] Could not load user profile:", err);
        }
      }
    };

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setAuth(s?.user ?? null, s);
        initSession(s?.user?.id);
      })
      .catch(() => {
        // Supabase unreachable on init; remain logged out
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuth(s?.user ?? null, s);
      initSession(s?.user?.id).catch(() => {});
    });

    return () => subscription.unsubscribe();
  }, [setAuth, activeEntityId, setActiveEntity]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      wrapNetworkError(err);
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
      wrapNetworkError(err);
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (err) {
      wrapNetworkError(err);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (err) {
      wrapNetworkError(err);
    }
  };

  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
    } catch (err) {
      wrapNetworkError(err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  return { user, session, isLoading, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, updateProfile };
}
