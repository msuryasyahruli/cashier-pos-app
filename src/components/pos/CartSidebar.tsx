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
import type { CartItem, CartSummary } from "../../hooks/useCart";
import { useCurrency } from "../../hooks/useCurrency";

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
  const { format } = useCurrency();
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
          "bg-surface flex flex-col shrink-0 border-divider",

          // ── Desktop layout (sm+) ──
          "sm:relative sm:w-72 lg:w-96 sm:border-l sm:shadow-none sm:translate-y-0 sm:z-auto sm:h-full",

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
        <div className="p-4 border-b border-divider flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-ink-primary">
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
                className="text-xs text-status-dangerText font-medium flex items-center gap-1 p-1 hover:bg-status-dangerBg rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
            {/* Close button — only visible on mobile */}
            <button
              onClick={onMobileClose}
              className="sm:hidden p-1.5 rounded-lg text-ink-secondary hover:bg-surface-hover hover:text-ink-primary transition-colors"
              aria-label="Close cart"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
          {items.length === 0 ? (
            <div className="h-48 sm:h-full flex flex-col items-center justify-center text-center p-6 text-ink-secondary">
              <div className="w-16 h-16 rounded-2xl bg-canvas flex items-center justify-center mb-3 text-ink-secondary">
                <ShoppingBag size={28} />
              </div>
              <p className="font-semibold text-ink-primary text-sm">
                No items in order
              </p>
              <p className="text-xs text-ink-secondary max-w-[200px] mt-1">
                Select products from the catalog on the left to add them to this
                transaction.
              </p>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="p-3 bg-surface-hover rounded-xl border border-divider flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-ink-primary truncate">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-ink-secondary font-medium mt-0.5">
                    {format(product.price)} × {quantity}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                    className="p-1 rounded-lg bg-surface border border-divider text-ink-primary hover:bg-canvas transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-ink-primary">
                    {quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    disabled={quantity >= product.stock}
                    className="p-1 rounded-lg bg-surface border border-divider text-ink-primary hover:bg-canvas disabled:opacity-40 transition-colors"
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
        <div className="p-4 bg-surface-hover border-t border-divider space-y-3 shrink-0">
          {/* Discount Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block mb-1.5">
              Quick Discount
            </span>
            <div className="flex gap-1.5">
              {[0, 5, 10, 15, 20].map((percent) => (
                <button
                  key={percent}
                  onClick={() => onApplyDiscount(percent)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    discountPercent === percent
                      ? "bg-brand border-brand text-ink-onPrimary shadow-xs"
                      : "bg-surface border-divider text-ink-secondary hover:bg-canvas hover:text-ink-primary"
                  }`}
                >
                  {percent === 0 ? "0%" : `${percent}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs text-ink-secondary pt-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-ink-primary">
                {format(summary.subtotal)}
              </span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between text-status-infoText font-medium">
                <span>Discount ({discountPercent}%)</span>
                <span className="font-mono font-semibold">
                  -{format(summary.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Estimated Tax ({summary.taxRate * 100}%)</span>
              <span className="font-mono font-semibold text-ink-primary">
                {format(summary.taxAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-divider flex justify-between items-baseline">
              <span className="font-bold text-ink-primary text-sm">
                Total Due
              </span>
              <span className="font-mono font-extrabold text-xl text-ink-primary">
                {format(summary.total)}
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
                ({format(summary.total)})
              </span>
            </span>
          </Button>
        </div>
      </div>
    </>
  );
};
