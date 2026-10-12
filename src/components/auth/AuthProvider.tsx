// src/components/auth/AuthProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id?: string;
  name?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  email?: string;
  [key: string]: any;
}

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Grab the initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen to auth state changes (TOKEN_REFRESHED, SIGNED_OUT, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user?.id) {
        fetchUserProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
