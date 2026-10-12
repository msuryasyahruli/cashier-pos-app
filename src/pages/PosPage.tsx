import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart, type Product } from "../configs/hooks/useCart";
import { Input } from "../components";
import {
  ProductCard,
  CartSidebar,
  CheckoutModal,
  type CompletedOrderInfo,
} from "../components/pos";
import { Search, ShoppingCart } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { saveTransactionToSupabase } from "../lib/transactionStorage";
import { useAuth } from "../components/auth/AuthProvider";
import Dropdown from "../components/Dropdown";

const CATEGORIES = ["All", "Coffee", "Tea", "Bakery", "Food", "Beverage"];

export const PosPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
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
  const [loading, setLoading] = useState<boolean>(true);

  const { profile } = useAuth();

  const fetchProducts = async () => {
    setLoading(true);

    let query = supabase.from("products").select("*").order("created_at");

    if (selectedCategory !== "All") {
      query = query.eq("category", selectedCategory);
    }

    if (searchQuery.trim()) {
      query = query.or(
        `name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching products:", error);
    } else if (data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [selectedCategory, searchQuery]);

  const {
    items,
    addItem,
    updateQuantity,
    clearCart,
    discountPercent,
    setDiscountPercent,
    summary,
  } = useCart(0.05);

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
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const paymentMethodLabel =
        paymentMethod === "cash"
          ? "Cash"
          : paymentMethod === "card"
            ? "Credit Card"
            : "QRIS";

      // 1. Insert transaction into Supabase
      const transactionPayload: Record<string, any> = {
        order_number: orderNumber,
        cashier: profile?.username || "Cashier User",
        items_count: summary.totalQuantity,
        total: parseFloat(summary.total.toFixed(2)),
        payment_method: paymentMethodLabel,
        status: "Completed",
        discount_percent: discountPercent,
      };

      let txData: any = null;

      const { data: insertedData, error: txError } = await supabase
        .from("transactions")
        .insert([transactionPayload])
        .select()
        .single();

      if (txError) {
        console.warn(
          "Retrying transaction insert without discount_percent field...",
        );
        const fallbackPayload = { ...transactionPayload };
        delete fallbackPayload.discount_percent;

        const fallbackRes = await supabase
          .from("transactions")
          .insert([fallbackPayload])
          .select()
          .single();
        if (fallbackRes.error) {
          throw new Error(
            `Failed to save transaction: ${fallbackRes.error.message}`,
          );
        }
        txData = fallbackRes.data;
      } else {
        txData = insertedData;
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

  return (
    <div className="flex-1 flex flex-col sm:flex-row h-full overflow-hidden bg-slate-100">
      {/* Left Area: Catalog & Product Search */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-auto min-w-0 space-y-4">
        {/* Top Controls: Search & Category Chips */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="w-full lg:w-72 shrink-0">
            <Input
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          {/* Category Chips */}
          {/* <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  selectedCategory === category
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {category}
              </button>
            ))}
          </div> */}
          <Dropdown
            label={selectedCategory}
            align="right"
            items={[
              { label: "All", onClick: () => setSelectedCategory("All") },
              {
                label: "Coffee",
                onClick: () => setSelectedCategory("Coffee"),
              },
              { label: "Tea", onClick: () => setSelectedCategory("Tea") },
              {
                label: "Bakery",
                onClick: () => setSelectedCategory("Bakery"),
              },
              { label: "Food", onClick: () => setSelectedCategory("Food") },
              {
                label: "Beverage",
                onClick: () => setSelectedCategory("Beverage"),
              },
            ]}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-4">
              <p className="font-semibold text-slate-600">No products found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Try selecting a different category or clearing your search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
