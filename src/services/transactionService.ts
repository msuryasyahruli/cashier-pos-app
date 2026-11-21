import { supabase } from "./supabaseClient";
import type { TransactionItem } from "../components/pos";
import {
  DEFAULT_CURRENCY,
  getCurrencyMeta,
  getExchangeRate,
  type CurrencyCode,
} from "../utils/currency";
import { fetchTransactionDetailFromSupabase } from "./transactionStorage";
import { adjustProductStock, checkStoreIdSupport } from "./productService";

// Cached column support check
let isStoreIdColumnSupported: boolean | null = null;
const TRANSACTION_STORE_MAP_KEY = "cashier_transaction_store_map";
const TRANSACTION_CURRENCY_MAP_KEY = "cashier_transaction_currency_map";

const isLocalStoreId = (storeId?: string | null): boolean =>
  Boolean(storeId && storeId.startsWith("local-store-"));

const sanitizePostgrestSearch = (raw: string): string =>
  raw.trim().replace(/[,()]/g, " ").replace(/\s+/g, " ");

export interface TransactionCurrencyRecord {
  currency: CurrencyCode;
  exchangeRate: number;
  isExplicit?: boolean;
}

export const getTransactionCurrencyMap = (): Record<
  string,
  TransactionCurrencyRecord
> => {
  try {
    return JSON.parse(
      localStorage.getItem(TRANSACTION_CURRENCY_MAP_KEY) || "{}",
    ) as Record<string, TransactionCurrencyRecord>;
  } catch {
    return {};
  }
};

export const rememberTransactionCurrency = (
  transactionId: string | null | undefined,
  orderNumber: string,
  currency: CurrencyCode,
  exchangeRate: number,
): void => {
  if (!currency) return;
  const map = getTransactionCurrencyMap();
  const validRate = exchangeRate > 0 ? exchangeRate : getExchangeRate(currency);
  const record: TransactionCurrencyRecord = {
    currency: getCurrencyMeta(currency).code,
    exchangeRate: validRate,
    isExplicit: true,
  };
  if (transactionId) map[`id:${transactionId}`] = record;
  map[`order:${orderNumber}`] = record;
  localStorage.setItem(TRANSACTION_CURRENCY_MAP_KEY, JSON.stringify(map));
};

export const getTransactionCurrency = (
  transactionId?: string | null,
  orderNumber?: string | null,
  rowCurrency?: string | null,
  rowExchangeRate?: number | null,
  storeDefaultCurrency?: CurrencyCode | string | null,
  storeExchangeRate?: number | null,
): TransactionCurrencyRecord => {
  // The database row is the source of truth; the local cache only covers
  // databases that have not applied the currency migration yet.
  if (rowCurrency) {
    const code = getCurrencyMeta(rowCurrency).code;
    return {
      currency: code,
      exchangeRate:
        rowExchangeRate && rowExchangeRate > 0
          ? rowExchangeRate
          : getExchangeRate(code),
      isExplicit: true,
    };
  }

  const map = getTransactionCurrencyMap();
  const localRecord =
    (transactionId && map[`id:${transactionId}`]) ||
    (orderNumber && map[`order:${orderNumber}`]);
  if (localRecord && localRecord.isExplicit) {
    return localRecord;
  }

  if (storeDefaultCurrency) {
    const code = getCurrencyMeta(storeDefaultCurrency).code;
    return {
      currency: code,
      exchangeRate:
        storeExchangeRate && storeExchangeRate > 0
          ? storeExchangeRate
          : getExchangeRate(code),
      isExplicit: false,
    };
  }

  return {
    currency: DEFAULT_CURRENCY,
    exchangeRate: 1,
    isExplicit: false,
  };
};

/**
 * Rows saved before the IDR base migration stored totals in USD and carry no
 * currency tag. Detect them so they are not read as tiny IDR amounts.
 */
export const isLegacyUsdTransaction = (
  total: number | string | null | undefined,
  rowCurrency: string | null | undefined,
  currencyInfo: TransactionCurrencyRecord,
): boolean => {
  const amount = Number(total) || 0;
  return !rowCurrency && !currencyInfo.isExplicit && amount > 0 && amount < 1000;
};

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

export const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const fetchTransactionsByStore = async (
  storeId: string,
  options: FetchTransactionsOptions = {},
): Promise<FetchTransactionsResult> => {
  if (!storeId || isLocalStoreId(storeId)) {
    return { data: [], count: 0, error: null };
  }

  const hasDbColumn = await checkTxStoreIdSupport();
  const sanitizedSearch = options.search
    ? sanitizePostgrestSearch(options.search)
    : "";

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
    if (sanitizedSearch) {
      const term = `%${sanitizedSearch}%`;
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
  if (sanitizedSearch) {
    const term = `%${sanitizedSearch}%`;
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
  totalCount: number;
}

export const fetchTransactionMetrics = async (
  storeId: string,
): Promise<TransactionMetrics> => {
  const empty: TransactionMetrics = {
    todaySales: 0,
    yesterdaySales: 0,
    completedCount: 0,
    totalCount: 0,
  };
  if (!storeId || isLocalStoreId(storeId)) return empty;

  try {
    const hasDbColumn = await checkTxStoreIdSupport();
    const storeMap = hasDbColumn ? {} : getTransactionStoreMap();
    const today = new Date();
    const todayStr = toLocalDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateKey(yesterday);
    const legacyUsdRate = getExchangeRate("USD");

    const pageSize = 1000;
    let from = 0;
    let todaySum = 0;
    let yesterdaySum = 0;
    let completed = 0;
    let totalCount = 0;

    while (true) {
      // Select all columns so currency fields are included when the migration
      // exists, without failing on databases that lack them.
      let q = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (hasDbColumn) q = q.eq("store_id", storeId);

      const { data, error } = await q;
      if (error || !data || data.length === 0) break;

      const batch = (
        hasDbColumn
          ? data
          : data.filter((tx) => belongsToStore(tx, storeId, storeMap))
      ) as TransactionItem[];

      totalCount += batch.length;

      for (const tx of batch) {
        const isCompleted = tx.status === "Completed";
        const txDateObj = tx.created_at ? new Date(tx.created_at) : null;
        const txDate =
          txDateObj && !Number.isNaN(txDateObj.getTime())
            ? toLocalDateKey(txDateObj)
            : "";
        if (isCompleted) {
          completed++;
          const amount = Number(tx.total) || 0;
          const info = getTransactionCurrency(
            tx.id,
            tx.order_number,
            tx.currency,
            tx.exchange_rate,
          );
          const amountIdr = isLegacyUsdTransaction(amount, tx.currency, info)
            ? amount * legacyUsdRate
            : amount;
          if (txDate === todayStr) todaySum += amountIdr;
          if (txDate === yesterdayStr) yesterdaySum += amountIdr;
        }
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return {
      todaySales: todaySum,
      yesterdaySales: yesterdaySum,
      completedCount: completed,
      totalCount,
    };
  } catch (e) {
    console.error("Error fetching transaction metrics:", e);
    return empty;
  }
};

/**
 * Refund a completed transaction atomically (via RPC when available) or by
 * conditionally updating status to Refunded FIRST before restoring product stock.
 */
export const refundTransaction = async (
  tx: TransactionItem,
  storeId?: string,
): Promise<{ error: any }> => {
  if (!tx || tx.status !== "Completed") {
    return { error: new Error("Only completed transactions can be refunded.") };
  }

  if (storeId && !isLocalStoreId(storeId)) {
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "refund_transaction",
      {
        p_transaction_id: tx.id,
        p_store_id: storeId,
      },
    );

    if (!rpcError) {
      if (rpcResult === false) {
        return {
          error: new Error("Transaction is already refunded or not found."),
        };
      }
      return { error: null };
    }

    const msg = (rpcError.message || "").toLowerCase();
    const isMissingRpc =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      msg.includes("refund_transaction");

    if (!isMissingRpc) {
      return { error: rpcError };
    }
  }

  // Fallback: update status conditionally FIRST so concurrent/failed refunds
  // can never inflate stock.
  const hasTxStoreId =
    storeId && !isLocalStoreId(storeId) ? await checkTxStoreIdSupport() : false;

  let updateQuery = supabase
    .from("transactions")
    .update({ status: "Refunded" })
    .eq("id", tx.id)
    .eq("status", "Completed");

  if (hasTxStoreId && storeId) {
    updateQuery = updateQuery.eq("store_id", storeId);
  }

  const { data: updatedTx, error: updateError } = await updateQuery
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { error: updateError };
  }
  if (!updatedTx) {
    return {
      error: new Error("Transaction is already refunded or not found."),
    };
  }

  const detail = await fetchTransactionDetailFromSupabase(
    tx.order_number,
    tx.id,
    tx.items_count,
    tx.total,
    tx.discount_percent,
  );

  if (!detail.isFallback && detail?.items?.length > 0) {
    const hasProductStoreId =
      storeId && !isLocalStoreId(storeId) ? await checkStoreIdSupport() : false;

    await Promise.all(
      detail.items.map(async (item) => {
        if (item.id) {
          const { error } = await adjustProductStock(
            item.id,
            item.quantity,
            storeId,
          );
          if (error) {
            console.warn(
              `Failed to restore stock for product ${item.id}:`,
              error,
            );
          }
          return;
        }

        if (!item.name) return;
        let query = supabase
          .from("products")
          .select("id")
          .eq("name", item.name)
          .limit(1);
        if (hasProductStoreId && storeId) {
          query = query.eq("store_id", storeId);
        }

        const { data: prods } = await query;
        if (prods && prods.length > 0) {
          await adjustProductStock(prods[0].id, item.quantity, storeId);
        }
      }),
    );
  }

  return { error: null };
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

