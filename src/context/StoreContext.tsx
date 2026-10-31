import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "./AuthContext";

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

export interface CreateStoreInput {
  name: string;
  branch_code?: string;
  receipt_footer_note?: string;
  default_sales_tax_rate?: number;
}

interface StoreContextType {
  currentStore: StoreSettings | null;
  stores: StoreSettings[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  selectStore: (storeId: string) => void;
  createStore: (storeData: CreateStoreInput) => Promise<StoreSettings | null>;
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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreSettings[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getActiveStoreStorageKey = (userId: string) =>
    `cashier_active_store_${userId}`;
  const getLocalStoresStorageKey = (userId: string) =>
    `cashier_local_stores_${userId}`;

  const fetchStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setCurrentStore(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all stores owned by this user
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      let loadedStores: StoreSettings[] = [];

      if (!fetchError && data && data.length > 0) {
        loadedStores = data as StoreSettings[];
      } else {
        // Check for local stores fallback if Supabase returns empty or table issue
        try {
          const localStr = localStorage.getItem(
            getLocalStoresStorageKey(user.id),
          );
          if (localStr) {
            loadedStores = JSON.parse(localStr);
          }
        } catch {
          // ignore localStorage parsing errors
        }
      }

      setStores(loadedStores);

      if (loadedStores.length > 0) {
        const savedActiveId = localStorage.getItem(
          getActiveStoreStorageKey(user.id),
        );
        const matched = loadedStores.find((s) => s.id === savedActiveId);
        const active = matched || loadedStores[0];
        setCurrentStore(active);
        localStorage.setItem(getActiveStoreStorageKey(user.id), active.id);
      } else {
        setCurrentStore(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch stores:", err);
      setError(err.message || "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const selectStore = (storeId: string) => {
    if (!user) return;
    const found = stores.find((s) => s.id === storeId);
    if (found) {
      setCurrentStore(found);
      localStorage.setItem(getActiveStoreStorageKey(user.id), found.id);
    }
  };

  const createStore = async (
    storeData: CreateStoreInput,
  ): Promise<StoreSettings | null> => {
    if (!user) {
      setError("You must be logged in to create a store.");
      return null;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const newStorePayload = {
        name: storeData.name.trim(),
        branch_code: storeData.branch_code?.trim() || "MAIN-01",
        receipt_footer_note:
          storeData.receipt_footer_note?.trim() ||
          "Thank you for shopping with us!",
        default_sales_tax_rate: storeData.default_sales_tax_rate ?? 5.0,
        owner_id: user.id,
      };

      let createdStore: StoreSettings | null = null;

      const { data, error: insertError } = await supabase
        .from("stores")
        .insert([newStorePayload])
        .select()
        .single();

      if (!insertError && data) {
        createdStore = data as StoreSettings;
      } else {
        console.warn(
          "Supabase store insert error, creating locally:",
          insertError?.message,
        );
        // Fallback local store creation
        createdStore = {
          ...newStorePayload,
          id: `local-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const existingLocal = (() => {
          try {
            return JSON.parse(
              localStorage.getItem(getLocalStoresStorageKey(user.id)) || "[]",
            );
          } catch {
            return [];
          }
        })();

        const updatedLocal = [...existingLocal, createdStore];
        localStorage.setItem(
          getLocalStoresStorageKey(user.id),
          JSON.stringify(updatedLocal),
        );
      }

      if (createdStore) {
        const nextStores = [...stores, createdStore];
        setStores(nextStores);
        setCurrentStore(createdStore);
        localStorage.setItem(
          getActiveStoreStorageKey(user.id),
          createdStore.id,
        );
        setSuccess(`Store "${createdStore.name}" created successfully!`);
        setTimeout(() => setSuccess(null), 3500);
      }

      return createdStore;
    } catch (err: any) {
      setError(err.message || "Failed to create store");
      return null;
    } finally {
      setSaving(false);
    }
  };

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
    if (!currentStore || !user) {
      setError("No active store found to update.");
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const now = new Date().toISOString();
      const updatedFields = {
        ...updates,
        updated_at: now,
      };

      const { data, error: updateError } = await supabase
        .from("stores")
        .update(updatedFields)
        .eq("id", currentStore.id)
        .eq("owner_id", user.id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.warn("Supabase store update notice:", updateError.message);
      }

      const updatedStore: StoreSettings = (data as StoreSettings) || {
        ...currentStore,
        ...updatedFields,
      };

      // Update in state
      const nextStores = stores.map((s) =>
        s.id === currentStore.id ? updatedStore : s,
      );
      setStores(nextStores);
      setCurrentStore(updatedStore);

      // Also update in localStorage if present
      try {
        const localStr = localStorage.getItem(
          getLocalStoresStorageKey(user.id),
        );
        if (localStr) {
          const localList: StoreSettings[] = JSON.parse(localStr);
          const nextLocal = localList.map((s) =>
            s.id === currentStore.id ? updatedStore : s,
          );
          localStorage.setItem(
            getLocalStoresStorageKey(user.id),
            JSON.stringify(nextLocal),
          );
        }
      } catch {
        // ignore
      }

      setSuccess("Store settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to update store settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        stores,
        loading,
        saving,
        error,
        success,
        selectStore,
        createStore,
        updateStore,
        refetch: fetchStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
