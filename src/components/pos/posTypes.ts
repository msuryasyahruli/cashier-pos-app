import type { Product } from "../../hooks/useCart";
import type { CurrencyCode } from "../../utils/currency";

export interface CompletedOrderInfo {
  orderNumber: string;
  items: { product: Product; quantity: number }[];
  summary: {
    taxRate: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    totalQuantity: number;
  };
  paymentMethod: string;
  cashReceived?: number;
  changeAmount?: number;
  createdAt: string;
  currency?: CurrencyCode;
  exchangeRate?: number;
}

export interface TransactionItem {
  id: string;
  store_id?: string | null;
  order_number: string;
  created_at: string;
  cashier: string;
  items_count: number;
  total: number;
  payment_method: string;
  status: "Completed" | "Refunded" | "Pending";
  discount_percent?: number;
  currency?: string | null;
  exchange_rate?: number | null;
}
