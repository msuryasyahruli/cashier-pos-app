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
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  getCurrencyMeta,
  type CurrencyCode,
  type ExchangeRatesMap,
} from "../utils/currency";

export interface StoreSettings {
  id: string;
  name: string;
  branch_code: string;
  receipt_footer_note: string;
  default_sales_tax_rate: number;
  currency?: CurrencyCode;
  exchange_rates?: ExchangeRatesMap;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface CreateStoreInput {
  name: string;
  branch_code?: string;
  receipt_footer_note?: string;
  default_sales_tax_rate?: number;
  currency?: CurrencyCode;
  exchange_rates?: ExchangeRatesMap;
}

interface StoreCurrencyCacheEntry {
  currency: CurrencyCode;
  exchange_rates: ExchangeRatesMap;
}

const STORE_CURRENCY_MAP_KEY = "cashier_store_currencies";

const getStoreCurrencyMap = (): Record<string, StoreCurrencyCacheEntry> => {
  try {
    return JSON.parse(
      localStorage.getItem(STORE_CURRENCY_MAP_KEY) || "{}",
    ) as Record<string, StoreCurrencyCacheEntry>;
  } catch {
    return {};
  }
};

const saveStoreCurrencyEntry = (
  storeId: string,
  currency: CurrencyCode,
  exchangeRates: ExchangeRatesMap,
): void => {
  if (!storeId) return;
  try {
    const map = getStoreCurrencyMap();
    map[storeId] = {
      currency,
      exchange_rates: {
        ...DEFAULT_EXCHANGE_RATES,
        ...(map[storeId]?.exchange_rates || {}),
        ...exchangeRates,
        IDR: 1,
      },
    };
    localStorage.setItem(STORE_CURRENCY_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
};

const hydrateStoreCurrency = (store: StoreSettings): StoreSettings => {
  const map = getStoreCurrencyMap();
  const cached = map[store.id];
  const resolvedCurrency = getCurrencyMeta(
    store.currency || cached?.currency || DEFAULT_CURRENCY,
  ).code;
  const resolvedRates: ExchangeRatesMap = {
    ...DEFAULT_EXCHANGE_RATES,
    ...(cached?.exchange_rates || {}),
    ...(store.exchange_rates || {}),
    IDR: 1,
  };
  return {
    ...store,
    currency: resolvedCurrency,
    exchange_rates: resolvedRates,
  };
};

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
        | "currency"
        | "exchange_rates"
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
  const userId = user?.id ?? null;
  const [stores, setStores] = useState<StoreSettings[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getActiveStoreStorageKey = (uid: string) =>
    `cashier_active_store_${uid}`;
  const getLocalStoresStorageKey = (uid: string) =>
    `cashier_local_stores_${uid}`;

  const fetchStores = useCallback(async () => {
    if (!userId) {
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
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });

      let loadedStores: StoreSettings[] = [];

      if (fetchError) {
        setError(fetchError.message || "Failed to load stores from server");
      }

      if (!fetchError && data && data.length > 0) {
        loadedStores = (data as StoreSettings[]).map(hydrateStoreCurrency);
      } else {
        // Check for local stores fallback if Supabase returns empty or table issue
        try {
          const localStr = localStorage.getItem(
            getLocalStoresStorageKey(userId),
          );
          if (localStr) {
            loadedStores = (JSON.parse(localStr) as StoreSettings[]).map(
              hydrateStoreCurrency,
            );
          }
        } catch {
          // ignore localStorage parsing errors
        }
      }

      setStores(loadedStores);

      if (loadedStores.length > 0) {
        const savedActiveId = localStorage.getItem(
          getActiveStoreStorageKey(userId),
        );
        const matched = loadedStores.find((s) => s.id === savedActiveId);
        const active = matched || loadedStores[0];
        setCurrentStore(active);
        localStorage.setItem(getActiveStoreStorageKey(userId), active.id);
      } else {
        setCurrentStore(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch stores:", err);
      setError(err.message || "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

      const initialCurrency = getCurrencyMeta(
        storeData.currency || DEFAULT_CURRENCY,
      ).code;
      const initialRates: ExchangeRatesMap = {
        ...DEFAULT_EXCHANGE_RATES,
        ...(storeData.exchange_rates || {}),
        IDR: 1,
      };

      const basePayload = {
        name: storeData.name.trim(),
        branch_code: storeData.branch_code?.trim() || "MAIN-01",
        receipt_footer_note:
          storeData.receipt_footer_note?.trim() ||
          "Thank you for shopping with us!",
        default_sales_tax_rate: storeData.default_sales_tax_rate ?? 5.0,
        owner_id: user.id,
      };

      let createdStore: StoreSettings | null = null;

      let { data, error: insertError } = await supabase
        .from("stores")
        .insert([
          {
            ...basePayload,
            currency: initialCurrency,
            exchange_rates: initialRates,
          },
        ])
        .select()
        .single();

      if (
        insertError &&
        (insertError.code === "42703" ||
          insertError.code === "PGRST204" ||
          insertError.message?.includes("currency") ||
          insertError.message?.includes("exchange_rates"))
      ) {
        const retry = await supabase
          .from("stores")
          .insert([basePayload])
          .select()
          .single();
        data = retry.data;
        insertError = retry.error;
      }

      if (!insertError && data) {
        createdStore = hydrateStoreCurrency({
          ...(data as StoreSettings),
          currency: initialCurrency,
          exchange_rates: initialRates,
        });
      } else {
        console.warn(
          "Supabase store insert error, creating locally:",
          insertError?.message,
        );
        // Fallback local store creation
        createdStore = hydrateStoreCurrency({
          ...basePayload,
          currency: initialCurrency,
          exchange_rates: initialRates,
          id: `local-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

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
        saveStoreCurrencyEntry(
          createdStore.id,
          createdStore.currency || DEFAULT_CURRENCY,
          createdStore.exchange_rates || DEFAULT_EXCHANGE_RATES,
        );
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
        | "currency"
        | "exchange_rates"
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
      const { currency, exchange_rates, ...dbUpdates } = updates;
      const nextCurrency = getCurrencyMeta(
        currency ?? currentStore.currency ?? DEFAULT_CURRENCY,
      ).code;
      const nextRates: ExchangeRatesMap = {
        ...DEFAULT_EXCHANGE_RATES,
        ...(currentStore.exchange_rates || {}),
        ...(exchange_rates || {}),
        IDR: 1,
      };

      const dbPayload = {
        ...dbUpdates,
        updated_at: now,
      };

      const isLocalStore = currentStore.id.startsWith("local-store-");
      let remoteData: StoreSettings | null = null;

      if (!isLocalStore) {
        let { data, error: updateError } = await supabase
          .from("stores")
          .update({
            ...dbPayload,
            currency: nextCurrency,
            exchange_rates: nextRates,
          })
          .eq("id", currentStore.id)
          .eq("owner_id", user.id)
          .select()
          .maybeSingle();

        if (
          updateError &&
          (updateError.code === "42703" ||
            updateError.code === "PGRST204" ||
            updateError.message?.includes("currency") ||
            updateError.message?.includes("exchange_rates"))
        ) {
          const retry = await supabase
            .from("stores")
            .update(dbPayload)
            .eq("id", currentStore.id)
            .eq("owner_id", user.id)
            .select()
            .maybeSingle();
          data = retry.data;
          updateError = retry.error;
        }

        if (updateError) {
          setError(updateError.message || "Failed to update store settings");
          return false;
        }
        if (data) {
          remoteData = data as StoreSettings;
        }
      }

      saveStoreCurrencyEntry(currentStore.id, nextCurrency, nextRates);

      const updatedStore: StoreSettings = hydrateStoreCurrency({
        ...currentStore,
        ...(remoteData || dbPayload),
        currency: nextCurrency,
        exchange_rates: nextRates,
      });

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
