import { useState, useMemo, useCallback } from "react";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku?: string;
  low_stock_threshold?: number;
  barcode?: string | number;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartSummary {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  total: number;
  totalQuantity: number;
}

export function useCart(taxRate: number = 0.0) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const addItem = useCallback((product: Product) => {
    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prevItems;
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems.filter((item) => item.product.id !== productId);
      }
      return prevItems.map((item) => {
        if (item.product.id === productId) {
          const validQty = Math.min(quantity, item.product.stock);
          return { ...item, quantity: validQty };
        }
        return item;
      });
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => item.product.id !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountPercent(0);
  }, []);

  const summary: CartSummary = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableSubtotal * taxRate;
    const total = taxableSubtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      taxRate,
      discountAmount,
      total,
      totalQuantity,
    };
  }, [items, discountPercent, taxRate]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    discountPercent,
    setDiscountPercent,
    summary,
  };
}
