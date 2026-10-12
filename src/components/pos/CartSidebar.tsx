import React from "react";
import { Badge, Button } from "../";
import {
  Trash2,
  ShoppingBag,
  Minus,
  Plus,
  CreditCard,
  Banknote,
  QrCode,
  X,
} from "lucide-react";
import type { CartItem, CartSummary } from "../../configs/hooks/useCart";

interface CartSidebarProps {
  items: CartItem[];
  summary: CartSummary;
  discountPercent: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onClearCart: () => void;
  onApplyDiscount: (percent: number) => void;
  onOpenCheckout: () => void;
  /** Mobile only: whether the bottom-sheet is open */
  isMobileOpen?: boolean;
  /** Mobile only: callback to close the bottom-sheet */
  onMobileClose?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  items,
  summary,
  discountPercent,
  onUpdateQuantity,
  onClearCart,
  onApplyDiscount,
  onOpenCheckout,
  isMobileOpen = false,
  onMobileClose,
}) => {
  return (
    <>
      {/* ── Mobile backdrop ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 sm:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/*
        Desktop  : static right sidebar (sm+)
        Mobile   : slide-up bottom sheet triggered by isMobileOpen
      */}
      <div
        className={[
          // ── Shared base ──
          "bg-white flex flex-col shrink-0 border-slate-200/80",

          // ── Desktop layout (sm+) ──
          "sm:relative sm:w-96 sm:border-l sm:shadow-none sm:translate-y-0 sm:z-auto sm:h-full",

          // ── Mobile layout: full-width bottom sheet, slide in/out ──
          "fixed bottom-0 left-0 right-0 z-40 border-t rounded-t-2xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          isMobileOpen ? "translate-y-0" : "translate-y-full",
          "sm:!translate-y-0 sm:!rounded-none sm:!shadow-none",

          // ── Mobile height: capped so content is never taller than 90vh ──
          "max-h-[90vh] sm:max-h-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-slate-800">
              Current Order
            </h2>
            {items.length > 0 && (
              <Badge variant="primary" size="sm">
                {summary.totalQuantity} items
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 p-1 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
            {/* Close button — only visible on mobile */}
            <button
              onClick={onMobileClose}
              className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close cart"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
          {items.length === 0 ? (
            <div className="h-48 sm:h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                <ShoppingBag size={28} />
              </div>
              <p className="font-semibold text-slate-600 text-sm">
                No items in order
              </p>
              <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                Select products from the catalog on the left to add them to this
                transaction.
              </p>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-slate-800 truncate">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    ${product.price.toFixed(2)} × {quantity}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    disabled={quantity >= product.stock}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    title={
                      quantity >= product.stock
                        ? "Maximum stock reached"
                        : "Increase quantity"
                    }
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 space-y-3 shrink-0">
          {/* Discount Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Discount
            </span>
            <div className="flex gap-1.5">
              {[0, 5, 10, 15, 20].map((percent) => (
                <button
                  key={percent}
                  onClick={() => onApplyDiscount(percent)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    discountPercent === percent
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {percent === 0 ? "0%" : `${percent}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">
                ${summary.subtotal.toFixed(2)}
              </span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount ({discountPercent}%)</span>
                <span className="font-mono font-semibold">
                  -${summary.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Estimated Tax (5%)</span>
              <span className="font-mono font-semibold">
                ${summary.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-sm">
                Total Due
              </span>
              <span className="font-mono font-extrabold text-xl text-indigo-600">
                ${summary.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            fullWidth
            size="lg"
            disabled={items.length === 0}
            onClick={onOpenCheckout}
            icon={
              <div className="flex items-center gap-1">
                <Banknote size={16} />
                <CreditCard size={16} />
                <QrCode size={16} />
              </div>
            }
          >
            {/* Truncate the price on very narrow screens */}
            <span className="truncate">
              Checkout
              <span className="hidden xs:inline sm:hidden lg:inline">
                {" "}
                (${summary.total.toFixed(2)})
              </span>
            </span>
          </Button>
        </div>
      </div>
    </>
  );
};
