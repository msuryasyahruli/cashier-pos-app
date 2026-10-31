import { supabase } from "./supabaseClient";

const LOCAL_CATEGORIES_KEY = "cashier_store_categories";

export interface StoreCategory {
  id: string | number;
  store_id: string;
  name: string;
}

const readLocalCategories = (): Record<string, StoreCategory[]> => {
  try {
    return JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || "{}",
    ) as Record<string, StoreCategory[]>;
  } catch {
    return {};
  }
};

const writeLocalCategories = (categories: Record<string, StoreCategory[]>) => {
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
};

export const fetchCategoriesByStore = async (
  storeId: string,
): Promise<{ data: StoreCategory[]; error: any }> => {
  if (!storeId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("categories")
    .select("id, store_id, name")
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .order("name", { ascending: true });

  if (!error) {
    const local = readLocalCategories()[storeId] || [];
    const merged = [...(data || []), ...local].filter(
      (category, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.name.toLowerCase() === category.name.toLowerCase(),
        ) === index,
    );
    return { data: merged as StoreCategory[], error: null };
  }

  // Keep category creation usable until the categories migration is applied.
  return { data: readLocalCategories()[storeId] || [], error: null };
};

export const createCategoryForStore = async (
  storeId: string,
  name: string,
): Promise<{ data: StoreCategory | null; error: any }> => {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!storeId || !normalizedName) {
    return { data: null, error: new Error("Category name is required.") };
  }

  const existing = await fetchCategoriesByStore(storeId);
  if (
    existing.data.some(
      (category) =>
        category.name.toLowerCase() === normalizedName.toLowerCase(),
    )
  ) {
    return {
      data: null,
      error: new Error("This category already exists in the selected store."),
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert([{ store_id: storeId, name: normalizedName }])
    .select("id, store_id, name")
    .maybeSingle();

  if (!error && data) return { data: data as StoreCategory, error: null };

  const category: StoreCategory = {
    id: `local-category-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    store_id: storeId,
    name: normalizedName,
  };
  const local = readLocalCategories();
  local[storeId] = [...(local[storeId] || []), category];
  writeLocalCategories(local);
  return { data: category, error: null };
};

export const updateCategoryForStore = async (
  categoryId: string | number,
  storeId: string,
  name: string,
): Promise<{ data: StoreCategory | null; error: any }> => {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) return { data: null, error: new Error("Category name is required.") };

  const { data, error } = await supabase
    .from("categories")
    .update({ name: normalizedName })
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .select("id, store_id, name")
    .maybeSingle();

  if (!error && data) return { data: data as StoreCategory, error: null };

  const local = readLocalCategories();
  const updated = (local[storeId] || []).map((category) =>
    String(category.id) === String(categoryId)
      ? { ...category, name: normalizedName }
      : category,
  );
  if (updated.some((category) => String(category.id) === String(categoryId))) {
    local[storeId] = updated;
    writeLocalCategories(local);
    return { data: updated.find((category) => String(category.id) === String(categoryId)) || null, error: null };
  }
  return { data: null, error: error || new Error("Category could not be updated.") };
};

export const deleteCategoryForStore = async (
  categoryId: string | number,
  storeId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", storeId);
  if (!error) return { error: null };

  const local = readLocalCategories();
  local[storeId] = (local[storeId] || []).filter(
    (category) => String(category.id) !== String(categoryId),
  );
  writeLocalCategories(local);
  return { error: null };
};

export const getCategoryNames = (categories: StoreCategory[]): string[] => {
  const names = categories.map((category) => category.name);
  return [...new Set([...names])].sort((a, b) => a.localeCompare(b));
};
