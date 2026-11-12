import { supabase } from "./supabaseClient";
import type { TransactionItem } from "../components/pos";

// Cached column support check
let isStoreIdColumnSupported: boolean | null = null;
const TRANSACTION_STORE_MAP_KEY = "cashier_transaction_store_map";

const getTransactionStoreMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(TRANSACTION_STORE_MAP_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

export const rememberTransactionStore = (
  transactionId: string | null | undefined,
  orderNumber: string,
  storeId: string,
): void => {
  if (!storeId) return;
  const map = getTransactionStoreMap();
  if (transactionId) map[`id:${transactionId}`] = storeId;
  map[`order:${orderNumber}`] = storeId;
  localStorage.setItem(TRANSACTION_STORE_MAP_KEY, JSON.stringify(map));
};

const belongsToStore = (
  transaction: Pick<TransactionItem, "id" | "order_number"> & {
    store_id?: string | null;
  },
  storeId: string,
  storeMap: Record<string, string>,
): boolean =>
  transaction.store_id === storeId ||
  storeMap[`id:${transaction.id}`] === storeId ||
  storeMap[`order:${transaction.order_number}`] === storeId;

export const checkTxStoreIdSupport = async (): Promise<boolean> => {
  if (isStoreIdColumnSupported !== null) return isStoreIdColumnSupported;
  try {
    const { error } = await supabase
      .from("transactions")
      .select("id, store_id")
      .limit(1);
    if (error && (error.code === "42703" || error.message?.includes("store_id"))) {
      isStoreIdColumnSupported = false;
    } else {
      isStoreIdColumnSupported = true;
    }
  } catch {
    isStoreIdColumnSupported = false;
  }
  return isStoreIdColumnSupported;
};

export interface FetchTransactionsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: "All" | "Completed" | "Refunded" | "Pending";
  /** Filter transactions to a specific calendar day (YYYY-MM-DD). */
  dateFilter?: string;
  /** Return every matching transaction instead of applying pagination. */
  fetchAll?: boolean;
  /** Fallback: filter by cashier name when store_id column is absent */
  cashierName?: string;
}

export interface FetchTransactionsResult {
  data: TransactionItem[];
  count: number;
  error: any;
}

const getLocalDateRange = (dateStr: string): { start: Date; end: Date } | null => {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { start, end };
};

const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const fetchTransactionsByStore = async (
  storeId: string,
  options: FetchTransactionsOptions = {},
): Promise<FetchTransactionsResult> => {
  if (!storeId) return { data: [], count: 0, error: null };

  const hasDbColumn = await checkTxStoreIdSupport();

  const buildBaseQuery = (countMode = false) => {
    let q = supabase
      .from("transactions")
      .select("*", { count: countMode ? "exact" : undefined })
      .order("created_at", { ascending: false });

    if (hasDbColumn) {
      q = q.eq("store_id", storeId);
    }

    if (options.statusFilter && options.statusFilter !== "All") {
      q = q.eq("status", options.statusFilter);
    }
    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      q = q.or(
        `order_number.ilike.${term},cashier.ilike.${term},payment_method.ilike.${term}`,
      );
    }
    if (options.dateFilter) {
      const range = getLocalDateRange(options.dateFilter);
      if (range) {
        q = q
          .gte("created_at", range.start.toISOString())
          .lt("created_at", range.end.toISOString());
      }
    }
    return q;
  };

  if (hasDbColumn) {
    const from = ((options.page ?? 1) - 1) * (options.pageSize ?? 10);
    const to = from + (options.pageSize ?? 10) - 1;
    const query = buildBaseQuery(true);
    const result = options.fetchAll
      ? await query
      : await query.range(from, to);
    const { data, count, error } = result;
    if (!error) return { data: (data || []) as TransactionItem[], count: count ?? 0, error: null };
    // If error is about store_id column, flip and fall through
    if (error.code === "42703" || error.message?.includes("store_id")) {
      isStoreIdColumnSupported = false;
    } else {
      return { data: [], count: 0, error };
    }
  }

  // ── Fallback: no store_id column → return all transactions (scoped to the
  //    current user's session via Supabase RLS or show all if RLS is open).
  //    We store storeId in localStorage-based tx map for future reference.
  let q = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.statusFilter && options.statusFilter !== "All") {
    q = q.eq("status", options.statusFilter);
  }
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    q = q.or(
      `order_number.ilike.${term},cashier.ilike.${term},payment_method.ilike.${term}`,
    );
  }
  if (options.dateFilter) {
    const range = getLocalDateRange(options.dateFilter);
    if (range) {
      q = q
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString());
    }
  }

  const { data, error } = await q;
  if (error) return { data: [], count: 0, error };

  const storeTransactions = ((data || []) as TransactionItem[]).filter((tx) =>
    belongsToStore(tx, storeId, getTransactionStoreMap()),
  );
  const from = ((options.page ?? 1) - 1) * (options.pageSize ?? 10);
  const pagedTransactions = options.fetchAll
    ? storeTransactions
    : storeTransactions.slice(from, from + (options.pageSize ?? 10));

  return {
    data: pagedTransactions,
    count: storeTransactions.length,
    error: null,
  };
};

export interface TransactionMetrics {
  todaySales: number;
  yesterdaySales: number;
  completedCount: number;
}

export const fetchTransactionMetrics = async (
  storeId: string,
): Promise<TransactionMetrics> => {
  const empty = { todaySales: 0, yesterdaySales: 0, completedCount: 0 };
  if (!storeId) return empty;

  try {
    const hasDbColumn = await checkTxStoreIdSupport();

    let q = supabase.from("transactions").select("id, order_number, total, status, created_at");
    if (hasDbColumn) q = q.eq("store_id", storeId);

    const { data, error } = await q;
    if (error || !data) return empty;

    const transactions = (hasDbColumn
      ? data
      : data.filter((tx) =>
          belongsToStore(tx, storeId, getTransactionStoreMap()),
        )) as Array<Pick<TransactionItem, "id" | "order_number" | "total" | "status" | "created_at">>;
    const today = new Date();
    const todayStr = toLocalDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateKey(yesterday);
    let todaySum = 0;
    let yesterdaySum = 0;
    let completed = 0;

    for (const tx of transactions) {
      const isCompleted = tx.status === "Completed";
      const txDateObj = tx.created_at ? new Date(tx.created_at) : null;
      const txDate =
        txDateObj && !Number.isNaN(txDateObj.getTime())
          ? toLocalDateKey(txDateObj)
          : "";
      if (isCompleted) {
        completed++;
        if (txDate === todayStr) todaySum += Number(tx.total) || 0;
        if (txDate === yesterdayStr) yesterdaySum += Number(tx.total) || 0;
      }
    }

    return {
      todaySales: todaySum,
      yesterdaySales: yesterdaySum,
      completedCount: completed,
    };
  } catch (e) {
    console.error("Error fetching transaction metrics:", e);
    return empty;
  }
};

/** Attach store_id to a new transaction payload when saving (if column exists). */
export const buildTransactionPayload = async (
  base: Record<string, any>,
  storeId: string,
): Promise<Record<string, any>> => {
  const hasCol = await checkTxStoreIdSupport();
  if (hasCol && storeId) {
    return { ...base, store_id: storeId };
  }
  return base;
};

