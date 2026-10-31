import { useStore, type StoreSettings } from "../context/StoreContext";

export type { StoreSettings };

export interface UseStoreSettingsReturn {
  store: StoreSettings | null;
  stores: StoreSettings[];
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
  createStore: (storeData: {
    name: string;
    branch_code?: string;
    receipt_footer_note?: string;
    default_sales_tax_rate?: number;
  }) => Promise<StoreSettings | null>;
  selectStore: (storeId: string) => void;
  refetch: () => Promise<void>;
}

export const useStoreSettings = (): UseStoreSettingsReturn => {
  const {
    currentStore,
    stores,
    loading,
    saving,
    error,
    success,
    updateStore,
    createStore,
    selectStore,
    refetch,
  } = useStore();

  return {
    store: currentStore,
    stores,
    loading,
    saving,
    error,
    success,
    updateStore,
    createStore,
    selectStore,
    refetch,
  };
};
