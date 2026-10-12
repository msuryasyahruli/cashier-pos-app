import type { Product } from "../../configs/hooks/useCart";

export interface CompletedOrderInfo {
  orderNumber: string;
  items: { product: Product; quantity: number }[];
  summary: {
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
}

export interface TransactionItem {
  id: string;
  order_number: string;
  created_at: string;
  cashier: string;
  items_count: number;
  total: number;
  payment_method: string;
  status: "Completed" | "Refunded" | "Pending";
  discount_percent?: number;
}
