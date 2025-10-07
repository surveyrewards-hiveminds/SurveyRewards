import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type User = typeof supabase.auth.getUser extends () => Promise<{
  data: { user: infer U };
}>
  ? U
  : unknown;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user state
    const getInitialUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getInitialUser();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  return { user, loading };
}
