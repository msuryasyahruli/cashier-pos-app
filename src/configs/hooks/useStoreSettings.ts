import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/auth/AuthProvider";

export interface StoreSettings {
  id: string;
  name: string;
  branch_code: string;
  receipt_footer_note: string;
  default_sales_tax_rate: number;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

interface UseStoreSettingsReturn {
  store: StoreSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  updateStore: (
    updates: Partial<
      Pick<
        StoreSettings,
        | "name"
        | "branch_code"
        | "receipt_footer_note"
        | "default_sales_tax_rate"
      >
    >,
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useStoreSettings = (): UseStoreSettingsReturn => {
  const { user } = useAuth();
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchStore = useCallback(async () => {
    if (!user) {
      setStore(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setStore(data);
    } catch (err: any) {
      setError(err.message || "Failed to load store settings");
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const updateStore = async (
    updates: Partial<
      Pick<
        StoreSettings,
        | "name"
        | "branch_code"
        | "receipt_footer_note"
        | "default_sales_tax_rate"
      >
    >,
  ): Promise<boolean> => {
    if (!store || !user) {
      setError("No store found. Please create a store first.");
      return false;
    }

    try {
      setSaving(true);
      clearMessages();

      const { data, error: updateError } = await supabase
        .from("stores")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id)
        .eq("owner_id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setStore(data);
      setSuccess("Store settings saved successfully!");

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to save store settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    store,
    loading,
    saving,
    error,
    success,
    updateStore,
    refetch: fetchStore,
  };
};
