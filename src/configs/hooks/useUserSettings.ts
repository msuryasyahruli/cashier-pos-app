import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/auth/AuthProvider";

export interface UserSettings {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  username: string;
}

interface UseUserSettingsReturn {
  userSettings: UserSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  updateUser: (
    updates: Partial<Pick<UserSettings, "username" | "email">>,
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsReturn => {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchUser = useCallback(async () => {
    if (!user) {
      setUserSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setUserSettings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load user settings");
      setUserSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateUser = async (
    updates: Partial<Pick<UserSettings, "username" | "email">>,
  ): Promise<boolean> => {
    if (!userSettings || !user) {
      setError("No user found.");
      return false;
    }

    try {
      setSaving(true);
      clearMessages();

      const { data, error: updateError } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setUserSettings(data);
      setSuccess("User profile updated successfully!");

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to update user profile");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    userSettings,
    loading,
    saving,
    error,
    success,
    updateUser,
    refetch: fetchUser,
  };
};
