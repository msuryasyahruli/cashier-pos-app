import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  fetchProductsByStore,
  mapInventoryToPosProducts,
} from "../services/productService";
import { CreateStoreModal } from "../components/store/CreateStoreModal";
import {
  buildTransactionPayload,
  rememberTransactionStore,
} from "../services/transactionService";
import Dropdown from "../components/Dropdown";
import {
  fetchCategoriesByStore,
  getCategoryNames,
} from "../services/categoryService";
import { createNextOrderNumber } from "../services/orderNumberService";

export const PosPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  const fetchProducts = async () => {
    if (!currentStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await fetchProductsByStore(currentStore.id, {
      category: selectedCategory,
      search: searchQuery,
    });

    if (error) {
      console.error("Error fetching POS products:", error);
    } else {
      setProducts(mapInventoryToPosProducts(data));
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [currentStore?.id, selectedCategory, searchQuery]);

  useEffect(() => {
    if (!currentStore?.id) {
      setCategories([]);
      return;
    }
    fetchCategoriesByStore(currentStore.id).then(({ data }) => {
      setCategories(getCategoryNames(data));
    });
  }, [currentStore?.id]);

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

  const handleOpenCheckout = () => {
    setCashTendered(summary.total.toFixed(2));
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
    const cashAmountNum = parseFloat(cashTendered) || 0;
    const changeDue = Math.max(0, cashAmountNum - summary.total);

    if (paymentMethod === "cash" && cashAmountNum < summary.total) {
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
        payment_method: paymentMethodLabel,
        status: "Completed",
        discount_percent: discountPercent,
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

        if (insertPayload.discount_percent !== undefined) {
          console.warn(
            "Retrying transaction insert without discount_percent field...",
          );
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.discount_percent;
          insertPayload = fallbackPayload;
          continue;
        }

        throw new Error(`Failed to save transaction: ${txError.message}`);
      }

      if (!txData) {
        throw new Error("Failed to save transaction after multiple attempts.");
      }

      // 2. Decrement stock for each purchased item
      const stockUpdates = items.map(async (item) => {
        const newStock = Math.max(0, item.product.stock - item.quantity);
        const { error: prodError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product.id);

        if (prodError) {
          console.error(
            `Error updating stock for ${item.product.name}:`,
            prodError,
          );
        }
      });

      await Promise.all(stockUpdates);

      // 3. Refresh product list locally & remote
      fetchProducts();

      // 4. Save detailed items info to local storage
      const txId = txData?.id || null;
      rememberTransactionStore(txId, orderNumber, currentStore?.id ?? "");
      saveTransactionToSupabase(
        txId,
        orderNumber,
        items,
        discountPercent,
        summary,
        paymentMethod === "cash" ? cashAmountNum : undefined,
        paymentMethod === "cash" ? changeDue : undefined,
      );

      // 5. Save completed order summary for receipt display
      setCompletedOrder({
        orderNumber,
        items: [...items],
        summary: { ...summary },
        paymentMethod: paymentMethodLabel,
        cashReceived: paymentMethod === "cash" ? cashAmountNum : undefined,
        changeAmount: paymentMethod === "cash" ? changeDue : undefined,
        createdAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">No Store Selected</h2>
            <p className="text-xs text-slate-500 mt-1">
              Please set up or select a store to start taking orders and accessing the POS terminal.
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
    <div className="flex-1 flex flex-col sm:flex-row h-full overflow-hidden bg-slate-100">
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
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Loading products for {currentStore.name}...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
              <Store size={32} className="text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">
                No products found in {currentStore.name}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
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
          "bg-indigo-600 text-white font-semibold text-sm",
          "active:scale-95 transition-transform",
        ].join(" ")}
        aria-label="Open cart"
      >
        <ShoppingCart size={20} />
        {items.length > 0 && (
          <span className="bg-white text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {summary.totalQuantity}
          </span>
        )}
        <span className="sr-only sm:not-sr-only">
          {items.length === 0 ? "Cart" : `$${summary.total.toFixed(2)}`}
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
