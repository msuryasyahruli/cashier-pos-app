import { supabase } from "./supabaseClient";
import type { InventoryItem } from "../components/inventory/inventoryTypes";
import type { Product } from "../hooks/useCart";

// Cache only the database capability check; product ownership is stored in Supabase.
let isStoreIdColumnSupported: boolean | null = null;

const storeMigrationError = new Error(
  "Product store integration is not configured. Apply the store_id migration to the products table.",
);

export const checkStoreIdSupport = async (): Promise<boolean> => {
  if (isStoreIdColumnSupported !== null) {
    return isStoreIdColumnSupported;
  }

  try {
    const { error } = await supabase
      .from("products")
      .select("id, store_id")
      .limit(1);

    if (error && (error.code === "42703" || error.message?.includes("store_id"))) {
      isStoreIdColumnSupported = false;
      return false;
    }

    isStoreIdColumnSupported = true;
    return true;
  } catch {
    isStoreIdColumnSupported = false;
    return false;
  }
};

export interface FetchProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

export interface FetchProductsResult {
  data: InventoryItem[];
  count: number;
  error: any;
}

export const fetchProductsByStore = async (
  storeId: string,
  options: FetchProductsOptions = {},
): Promise<FetchProductsResult> => {
  if (!storeId) {
    return { data: [], count: 0, error: null };
  }

  const hasDbColumn = await checkStoreIdSupport();

  if (!hasDbColumn) {
    return { data: [], count: 0, error: storeMigrationError };
  }

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("store_id", storeId);

  if (options.category && options.category !== "All") {
    query = query.eq("category", options.category);
  }

  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},sku.ilike.${term},category.ilike.${term}`,
    );
  }

  query = query.order("name", { ascending: true });

  if (options.page && options.pageSize) {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;

  if (!error) {
    return {
      data: (data || []) as InventoryItem[],
      count: count ?? (data?.length || 0),
      error: null,
    };
  }

  if (error.code === "42703" || error.message?.includes("store_id")) {
    isStoreIdColumnSupported = false;
    return { data: [], count: 0, error: storeMigrationError };
  }
  return { data: [], count: 0, error };
};

export const fetchStoreMetrics = async (
  storeId: string,
): Promise<{ totalSkus: number; lowStockCount: number; totalUnits: number }> => {
  if (!storeId) {
    return { totalSkus: 0, lowStockCount: 0, totalUnits: 0 };
  }

  const { data } = await fetchProductsByStore(storeId);
  const products = data || [];

  const totalSkus = products.length;
  const lowStockCount = products.filter(
    (p) => p.stock <= (p.low_stock_threshold ?? 5),
  ).length;
  const totalUnits = products.reduce(
    (acc, p) => acc + (Number(p.stock) || 0),
    0,
  );

  return { totalSkus, lowStockCount, totalUnits };
};

export const addProductToStore = async (
  storeId: string,
  product: {
    sku: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    low_stock_threshold: number;
    barcode: number;
  },
): Promise<{ data: InventoryItem | null; error: any }> => {
  const hasDbColumn = await checkStoreIdSupport();

  if (!hasDbColumn) {
    return { data: null, error: storeMigrationError };
  }

  const payload = {
    ...product,
    store_id: storeId,
  };

  const { data, error } = await supabase
    .from("products")
    .insert([payload])
    .select()
    .maybeSingle();

  if (!error && data) {
    return { data: data as InventoryItem, error: null };
  }

  if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("store_id"))) {
    isStoreIdColumnSupported = false;
    return { data: null, error: storeMigrationError };
  }
  return { data: null, error };
};

export const updateProductInStore = async (
  productId: string,
  updates: Partial<InventoryItem>,
): Promise<{ data: InventoryItem | null; error: any }> => {
  const { data, error } = await supabase
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select()
    .maybeSingle();

  return { data: data as InventoryItem | null, error };
};

export const deleteProductFromStore = async (
  productId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  return { error };
};

export const mapInventoryToPosProducts = (items: InventoryItem[]): Product[] => {
  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    price: item.price,
    stock: item.stock,
    low_stock_threshold: item.low_stock_threshold,
    barcode: item.barcode,
  }));
};

