import { supabase } from "./supabaseClient";
import type { InventoryItem } from "../components/inventory/inventoryTypes";
import type { Product } from "../hooks/useCart";

// Cache only the database capability check; product ownership is stored in Supabase.
let isStoreIdColumnSupported: boolean | null = null;

const isLocalStoreId = (storeId?: string | null): boolean =>
  Boolean(storeId && storeId.startsWith("local-store-"));

const sanitizePostgrestSearch = (raw: string): string =>
  raw.trim().replace(/[,()]/g, " ").replace(/\s+/g, " ");

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
  if (!storeId || isLocalStoreId(storeId)) {
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

  const sanitizedSearch = options.search
    ? sanitizePostgrestSearch(options.search)
    : "";
  if (sanitizedSearch) {
    const term = `%${sanitizedSearch}%`;
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
  if (!storeId || isLocalStoreId(storeId)) {
    return { totalSkus: 0, lowStockCount: 0, totalUnits: 0 };
  }

  const hasDbColumn = await checkStoreIdSupport();
  if (!hasDbColumn) {
    return { totalSkus: 0, lowStockCount: 0, totalUnits: 0 };
  }

  const pageSize = 1000;
  let from = 0;
  let totalSkus = 0;
  let lowStockCount = 0;
  let totalUnits = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("stock, low_stock_threshold")
      .eq("store_id", storeId)
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;

    totalSkus += data.length;
    for (const p of data) {
      const stock = Number(p.stock) || 0;
      const threshold = p.low_stock_threshold ?? 5;
      if (stock <= threshold) lowStockCount++;
      totalUnits += stock;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

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
    barcode: string | number | null;
  },
): Promise<{ data: InventoryItem | null; error: any }> => {
  if (isLocalStoreId(storeId)) {
    return {
      data: null,
      error: new Error("Cannot add products to an unsynced local store."),
    };
  }

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
  storeId?: string,
): Promise<{ data: InventoryItem | null; error: any }> => {
  let query = supabase
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (storeId && !isLocalStoreId(storeId) && (await checkStoreIdSupport())) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query.select().maybeSingle();
  return { data: data as InventoryItem | null, error };
};

export const deleteProductFromStore = async (
  productId: string,
  storeId?: string,
): Promise<{ error: any }> => {
  let query = supabase.from("products").delete().eq("id", productId);

  if (storeId && !isLocalStoreId(storeId) && (await checkStoreIdSupport())) {
    query = query.eq("store_id", storeId);
  }

  const { error } = await query;
  return { error };
};

export const adjustProductStock = async (
  productId: string,
  delta: number,
  storeId?: string,
): Promise<{ error: any }> => {
  if (storeId && !isLocalStoreId(storeId)) {
    const { error: rpcError } = await supabase.rpc("adjust_product_stock", {
      p_product_id: productId,
      p_delta: delta,
      p_store_id: storeId,
    });

    if (!rpcError) {
      return { error: null };
    }

    const msg = (rpcError.message || "").toLowerCase();
    const isMissingRpc =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      msg.includes("adjust_product_stock");

    if (!isMissingRpc) {
      return { error: rpcError };
    }
  }

  const hasDbColumn =
    storeId && !isLocalStoreId(storeId) ? await checkStoreIdSupport() : false;

  let selectQuery = supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId);
  if (hasDbColumn && storeId) {
    selectQuery = selectQuery.eq("store_id", storeId);
  }

  const { data: product, error: fetchError } = await selectQuery.maybeSingle();
  if (fetchError) {
    return { error: fetchError };
  }
  if (!product) {
    return { error: new Error(`Product ${productId} not found.`) };
  }

  const nextStock = Math.max(0, (Number(product.stock) || 0) + delta);
  let updateQuery = supabase
    .from("products")
    .update({
      stock: nextStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (hasDbColumn && storeId) {
    updateQuery = updateQuery.eq("store_id", storeId);
  }

  const { error: updateError } = await updateQuery;
  return { error: updateError };
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
    barcode: item.barcode ?? undefined,
  }));
};

