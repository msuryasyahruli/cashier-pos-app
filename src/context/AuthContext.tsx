// src/context/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../services/supabaseClient";
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
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
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
  }, []);

  const userId = user?.id ?? null;
  const refreshProfile = useCallback(async () => {
    if (userId) {
      await fetchUserProfile(userId);
    }
  }, [userId, fetchUserProfile]);

  useEffect(() => {
    const syncSession = (newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      const nextUserId = newSession?.user?.id ?? null;

      if (nextUserId) {
        if (lastFetchedUserIdRef.current !== nextUserId) {
          lastFetchedUserIdRef.current = nextUserId;
          void fetchUserProfile(nextUserId);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      syncSession(initialSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
      }
      syncSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } finally {
      lastFetchedUserIdRef.current = null;
      setIsPasswordRecovery(false);
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isPasswordRecovery,
        signOut,
        refreshProfile,
        clearPasswordRecovery,
      }}
    >
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
