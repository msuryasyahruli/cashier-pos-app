import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart, type Product } from "../hooks/useCart";
import { Button, Input } from "../components";
import {
  ProductCard,
  CartSidebar,
  CheckoutModal,
  type CompletedOrderInfo,
} from "../components/pos";
import { Search, ShoppingCart, Store, Plus, ArrowRight } from "lucide-react";
import { supabase } from "../services/supabaseClient";
import { saveTransactionToSupabase } from "../services/transactionStorage";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  fetchProductsByStore,
  mapInventoryToPosProducts,
  adjustProductStock,
} from "../services/productService";
import { CreateStoreModal } from "../components/store/CreateStoreModal";
import {
  buildTransactionPayload,
  rememberTransactionStore,
  rememberTransactionCurrency,
} from "../services/transactionService";
import Dropdown from "../components/Dropdown";
import {
  fetchCategoriesByStore,
  getCategoryNames,
} from "../services/categoryService";
import { createNextOrderNumber } from "../services/orderNumberService";

export const PosPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentStore } = useStore();
  const storeId = currentStore?.id ?? null;
  const { currency, exchangeRate, format, fromDisplay, formatInput } =
    useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get("q") || "",
  );
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qris">(
    "card",
  );
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] =
    useState<CompletedOrderInfo | null>(null);
  /** Mobile-only: controls the cart bottom-sheet visibility */
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { profile } = useAuth();
  const prevStoreIdRef = useRef<string | null>(storeId);

  const taxRate =
    currentStore?.default_sales_tax_rate != null
      ? currentStore.default_sales_tax_rate / 100
      : 0.05;

  const {
    items,
    addItem,
    updateQuantity,
    clearCart,
    discountPercent,
    setDiscountPercent,
    summary,
  } = useCart(taxRate);

  // Sync URL ?q= parameter when navigated from global Header search
  const urlQuery = searchParams.get("q");
  useEffect(() => {
    if (urlQuery !== null) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  // Clear cart and category filter when switching active stores to prevent cross-store checkout
  useEffect(() => {
    if (prevStoreIdRef.current !== storeId) {
      prevStoreIdRef.current = storeId;
      clearCart();
      setSelectedCategory("All");
    }
  }, [storeId, clearCart]);

  const fetchProducts = useCallback(async () => {
    if (!storeId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await fetchProductsByStore(storeId, {
      category: selectedCategory,
      search: searchQuery,
    });

    if (error) {
      console.error("Error fetching POS products:", error);
    } else {
      setProducts(mapInventoryToPosProducts(data));
    }
    setLoading(false);
  }, [storeId, selectedCategory, searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchProducts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  useEffect(() => {
    if (!storeId) {
      setCategories([]);
      return;
    }
    let active = true;
    fetchCategoriesByStore(storeId).then(({ data }) => {
      if (active) setCategories(getCategoryNames(data));
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  const handleOpenCheckout = () => {
    setCashTendered(formatInput(summary.total));
    setErrorMessage(null);
    setPaymentSuccess(false);
    setIsCheckoutOpen(true);
  };

  const handleCloseAndReset = () => {
    setIsCheckoutOpen(false);
    setPaymentSuccess(false);
    setCompletedOrder(null);
    clearCart();
  };

  const handleCompletePayment = async () => {
    if (!currentStore?.id || items.length === 0) {
      setErrorMessage("Please select a store and add items to the cart.");
      return;
    }

    const cashAmountDisplay = parseFloat(cashTendered) || 0;
    const cashAmountIdr = fromDisplay(cashAmountDisplay);
    const changeDue = Math.max(0, cashAmountIdr - summary.total);

    if (paymentMethod === "cash" && cashAmountIdr + 0.01 < summary.total) {
      setErrorMessage("Cash received is less than total amount due.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let orderNumber = await createNextOrderNumber(currentStore?.id ?? "");
      const paymentMethodLabel =
        paymentMethod === "cash"
          ? "Cash"
          : paymentMethod === "card"
            ? "Credit Card"
            : "QRIS";

      // 1. Insert transaction into Supabase
      const basePayload: Record<string, any> = {
        order_number: orderNumber,
        cashier: profile?.username || "Cashier User",
        items_count: summary.totalQuantity,
        total: parseFloat(summary.total.toFixed(2)),
        tax_amount: parseFloat(summary.taxAmount.toFixed(2)),
        payment_method: paymentMethodLabel,
        status: "Completed",
        discount_percent: discountPercent,
        currency,
        exchange_rate: exchangeRate,
      };

      // Attach store_id if the column exists in the DB
      const transactionPayload = await buildTransactionPayload(
        basePayload,
        currentStore?.id ?? "",
      );

      let txData: any = null;
      let insertPayload = { ...transactionPayload };

      // Retry a few times if another checkout already used the generated
      // order number. This protects concurrent tabs and stale local counters.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: insertedData, error: txError } = await supabase
          .from("transactions")
          .insert([insertPayload])
          .select()
          .single();

        if (!txError) {
          txData = insertedData;
          break;
        }

        const isDuplicateOrderNumber =
          txError.code === "23505" &&
          (txError.message?.includes("order_number") ||
            txError.message?.includes("transactions_order_number_key"));

        if (isDuplicateOrderNumber && attempt < 4) {
          orderNumber = await createNextOrderNumber(currentStore?.id ?? "");
          insertPayload = { ...insertPayload, order_number: orderNumber };
          continue;
        }

        const errorMsg = (txError.message || "").toLowerCase();
        const isColumnMissing =
          txError.code === "42703" ||
          errorMsg.includes("column") ||
          errorMsg.includes("does not exist");

        if (
          isColumnMissing &&
          (errorMsg.includes("currency") ||
            errorMsg.includes("exchange_rate")) &&
          (insertPayload.currency !== undefined ||
            insertPayload.exchange_rate !== undefined)
        ) {
          console.warn(
            "Retrying transaction insert without currency/exchange_rate fields...",
          );
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.currency;
          delete fallbackPayload.exchange_rate;
          insertPayload = fallbackPayload;
          continue;
        }

        if (
          isColumnMissing &&
          errorMsg.includes("tax_amount") &&
          insertPayload.tax_amount !== undefined
        ) {
          console.warn(
            "Retrying transaction insert without tax_amount; apply the tax migration to store it.",
          );
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.tax_amount;
          insertPayload = fallbackPayload;
          continue;
        }

        if (
          isColumnMissing &&
          errorMsg.includes("discount_percent") &&
          insertPayload.discount_percent !== undefined
        ) {
          console.warn(
            "Retrying transaction insert without discount_percent field...",
          );
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.discount_percent;
          insertPayload = fallbackPayload;
          continue;
        }

        if (
          isColumnMissing &&
          errorMsg.includes("store_id") &&
          insertPayload.store_id !== undefined
        ) {
          console.warn("Retrying transaction insert without store_id field...");
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.store_id;
          insertPayload = fallbackPayload;
          continue;
        }

        throw new Error(`Failed to save transaction: ${txError.message}`);
      }

      if (!txData) {
        throw new Error("Failed to save transaction after multiple attempts.");
      }

      // 2. Decrement stock for each purchased item using fresh stock from DB
      const stockResults = await Promise.all(
        items.map(async (item) => {
          const { error: prodError } = await adjustProductStock(
            item.product.id,
            -item.quantity,
            currentStore.id,
          );
          if (prodError) {
            console.error(
              `Error updating stock for ${item.product.name}:`,
              prodError,
            );
          }
          return prodError;
        }),
      );

      if (stockResults.some(Boolean)) {
        console.warn(
          "One or more product stock updates failed after checkout.",
        );
      }

      // 3. Refresh product list locally & remote
      await fetchProducts();

      // 4. Save detailed items info
      const txId = txData?.id || null;
      rememberTransactionStore(txId, orderNumber, currentStore.id);
      rememberTransactionCurrency(txId, orderNumber, currency, exchangeRate);
      await saveTransactionToSupabase(
        txId,
        orderNumber,
        items,
        discountPercent,
        summary,
        paymentMethod === "cash" ? cashAmountIdr : undefined,
        paymentMethod === "cash" ? changeDue : undefined,
        currency,
        exchangeRate,
      );

      // 5. Save completed order summary for receipt display
      setCompletedOrder({
        orderNumber,
        items: [...items],
        summary: { ...summary },
        paymentMethod: paymentMethodLabel,
        cashReceived: paymentMethod === "cash" ? cashAmountIdr : undefined,
        changeAmount: paymentMethod === "cash" ? changeDue : undefined,
        createdAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        currency,
        exchangeRate,
      });

      setPaymentSuccess(true);
    } catch (err: any) {
      console.error("Payment processing error:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred during checkout.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // If no store is selected or set up
  if (!currentStore) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
        <div className="bg-surface p-8 rounded-2xl shadow-sm border border-divider max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-brand-tint text-brand-tintText rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-primary">
              No Store Selected
            </h2>
            <p className="text-xs text-ink-secondary mt-1">
              Please set up or select a store to start taking orders and
              accessing the POS terminal.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateStoreOpen(true)}
            className="mx-auto"
          >
            Set Up Your Store
          </Button>

          <CreateStoreModal
            isOpen={isCreateStoreOpen}
            onClose={() => setIsCreateStoreOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col sm:flex-row h-full overflow-hidden bg-canvas">
      {/* Left Area: Catalog & Product Search */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-auto min-w-0 space-y-4">
        {/* Top Controls: Search & Category Chips */}
        <div className="flex flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="w-full lg:w-72">
            <Input
              placeholder={`Search in ${currentStore.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          {/* Category Chips */}
          <Dropdown
            label={selectedCategory}
            align="right"
            size="sm"
            items={[
              { label: "All", onClick: () => setSelectedCategory("All") },
              ...categories.map((category) => ({
                label: category,
                onClick: () => setSelectedCategory(category),
              })),
            ]}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-ink-secondary">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">
                Loading products for {currentStore.name}...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-ink-secondary text-center p-6 bg-surface rounded-2xl border border-dashed border-divider">
              <Store size={32} className="text-ink-secondary mb-2" />
              <p className="font-semibold text-ink-primary">
                No products found in {currentStore.name}
              </p>
              <p className="text-xs text-ink-secondary mt-1 max-w-xs">
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your filter or search query."
                  : "Start by adding products to this store in Inventory."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                icon={<ArrowRight size={14} />}
                onClick={() => navigate("/inventory")}
              >
                Go to Inventory
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => {
                const inCart = items.find((i) => i.product.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCartQuantity={inCart ? inCart.quantity : 0}
                    onAddToCart={addItem}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile FAB: floating cart toggle (hidden on sm+) ── */}
      <button
        onClick={() => setIsMobileCartOpen(true)}
        className={[
          "sm:hidden fixed bottom-5 right-5 z-20",
          "flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl",
          "bg-brand hover:bg-brand-hover text-ink-onPrimary font-semibold text-sm",
          "active:scale-95 transition-transform",
        ].join(" ")}
        aria-label="Open cart"
      >
        <ShoppingCart size={20} />
        {items.length > 0 && (
          <span className="bg-surface text-brand text-xs font-bold px-2 py-0.5 rounded-full">
            {summary.totalQuantity}
          </span>
        )}
        <span className="sr-only sm:not-sr-only">
          {items.length === 0 ? "Cart" : format(summary.total)}
        </span>
      </button>

      {/* Right Area: Order Cart Sidebar */}
      <CartSidebar
        items={items}
        summary={summary}
        discountPercent={discountPercent}
        onUpdateQuantity={updateQuantity}
        onClearCart={clearCart}
        onApplyDiscount={setDiscountPercent}
        onOpenCheckout={handleOpenCheckout}
        isMobileOpen={isMobileCartOpen}
        onMobileClose={() => setIsMobileCartOpen(false)}
      />

      {/* Modal Checkout / Receipt */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        paymentSuccess={paymentSuccess}
        completedOrder={completedOrder}
        summary={summary}
        paymentMethod={paymentMethod}
        cashTendered={cashTendered}
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        cashierName={profile?.username || "Cashier User"}
        storeName={currentStore.name}
        receiptFooterNote={currentStore.receipt_footer_note}
        onClose={() => setIsCheckoutOpen(false)}
        onCloseAndReset={handleCloseAndReset}
        onNavigateToTransactions={() => navigate("/transactions")}
        onPrintReceipt={handlePrintReceipt}
        onCompletePayment={handleCompletePayment}
        onSetPaymentMethod={setPaymentMethod}
        onSetCashTendered={setCashTendered}
      />
    </div>
  );
};
