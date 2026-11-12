import { supabase } from "./supabaseClient";

const LOCAL_COUNTER_KEY = "cashier_store_order_counters";

const readLocalCounters = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_COUNTER_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
};

const formatOrderNumber = (value: number): string =>
  `ORD-${String(value).padStart(6, "0")}`;

export const createNextOrderNumber = async (storeId: string): Promise<string> => {
  if (!storeId) return `ORD-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase.rpc("next_store_order_number", {
    p_store_id: storeId,
  });

  if (!error && typeof data === "string") return data;

  // Fallback for clients that have not applied the counter migration yet.
  const counters = readLocalCounters();
  // Order numbers are globally unique in some database versions, so inspect
  // the highest existing ORD-xxxxxx values without scanning the entire table.
  const { data: existing } = await supabase
    .from("transactions")
    .select("order_number")
    .like("order_number", "ORD-%")
    .order("order_number", { ascending: false })
    .limit(50);
  const highest = (existing || []).reduce((max, transaction) => {
    const match = String(transaction.order_number || "").match(/^ORD-(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);

  counters[storeId] = Math.max(counters[storeId] || 0, highest);

  counters[storeId] += 1;
  localStorage.setItem(LOCAL_COUNTER_KEY, JSON.stringify(counters));
  return formatOrderNumber(counters[storeId]);
};
