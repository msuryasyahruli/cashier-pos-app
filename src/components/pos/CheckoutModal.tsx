import React from "react";
import { Modal, Button, Badge, Input } from "../";
import {
  Printer,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
} from "lucide-react";
import type { CompletedOrderInfo } from "./posTypes";
import type { CartSummary } from "../../hooks/useCart";
import { useCurrency } from "../../hooks/useCurrency";
import {
  formatCurrency,
  getExchangeRate,
  getQuickCashAmounts,
} from "../../utils/currency";

interface CheckoutModalProps {
  isOpen: boolean;
  paymentSuccess: boolean;
  completedOrder: CompletedOrderInfo | null;
  summary: CartSummary;
  paymentMethod: "cash" | "card" | "qris";
  cashTendered: string;
  isProcessing: boolean;
  errorMessage: string | null;
  cashierName?: string;
  storeName?: string;
  receiptFooterNote?: string;
  onClose: () => void;
  onCloseAndReset: () => void;
  onNavigateToTransactions: () => void;
  onPrintReceipt: () => void;
  onCompletePayment: () => void;
  onSetPaymentMethod: (method: "cash" | "card" | "qris") => void;
  onSetCashTendered: (val: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  paymentSuccess,
  completedOrder,
  summary,
  paymentMethod,
  cashTendered,
  isProcessing,
  errorMessage,
  cashierName = "Cashier User",
  storeName = "Store",
  receiptFooterNote,
  onClose,
  onCloseAndReset,
  onNavigateToTransactions,
  onPrintReceipt,
  onCompletePayment,
  onSetPaymentMethod,
  onSetCashTendered,
}) => {
  const {
    currency,
    currencyMeta,
    exchangeRates,
    format,
    formatDisplay,
    toDisplay,
  } = useCurrency();

  const receiptCurrency = completedOrder?.currency || currency;
  const receiptRate =
    completedOrder?.exchangeRate && completedOrder.exchangeRate > 0
      ? completedOrder.exchangeRate
      : getExchangeRate(receiptCurrency, exchangeRates);
  const formatReceipt = (amountIdr: number) =>
    formatCurrency(amountIdr, receiptCurrency, {
      [receiptCurrency]: receiptRate,
    });

  const totalDisplay = toDisplay(summary.total);
  const cashAmountDisplay = parseFloat(cashTendered) || 0;
  const changeDueDisplay = Math.max(0, cashAmountDisplay - totalDisplay);
  const isCashInsufficient =
    paymentMethod === "cash" &&
    (cashAmountDisplay <= 0 || cashAmountDisplay + 0.0001 < totalDisplay);

  const quickCashValues = getQuickCashAmounts(totalDisplay, currency);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) {
          if (paymentSuccess) {
            onCloseAndReset();
          } else {
            onClose();
          }
        }
      }}
      title={
        paymentSuccess
          ? "Receipt & Transaction Details"
          : "Complete Transaction"
      }
      footer={
        paymentSuccess ? (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrintReceipt}
              icon={<Printer size={15} />}
            >
              Print Receipt
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onCloseAndReset();
                  onNavigateToTransactions();
                }}
                icon={<ArrowRight size={15} />}
              >
                View in Transactions
              </Button>
              <Button size="sm" onClick={onCloseAndReset}>
                New Order
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing || isCashInsufficient}
              onClick={onCompletePayment}
              icon={
                isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : undefined
              }
            >
              {isProcessing
                ? "Processing Payment..."
                : `Confirm & Pay ${format(summary.total)}`}
            </Button>
          </>
        )
      }
    >
      {paymentSuccess && completedOrder ? (
        <div className="space-y-4 py-1">
          <div className="text-center pb-3 border-b border-divider">
            <div className="w-14 h-14 rounded-full bg-status-successBg text-status-successText flex items-center justify-center mx-auto mb-2.5 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-bold text-ink-primary">
              Payment Successful!
            </h4>
            <p className="text-xs text-ink-secondary mt-0.5">
              Transaction recorded to database and stock updated.
            </p>
          </div>

          {/* Receipt Card */}
          <div className="receipt-print-content bg-surface-hover rounded-xl p-4 border border-divider space-y-3 font-mono text-xs">
            <div className="text-center pb-2 border-b border-dashed border-divider">
              <h4 className="font-bold text-base text-ink-primary">
                {storeName}
              </h4>
              <p className="text-[10px] text-ink-secondary font-sans">
                Sales Receipt
              </p>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-divider">
              <div>
                <span className="font-bold text-ink-primary">
                  {completedOrder.orderNumber}
                </span>
                <p className="text-[10px] text-ink-secondary font-sans">
                  Cashier: {cashierName} • {completedOrder.createdAt}
                </p>
              </div>
              <Badge variant="success" size="sm">
                {completedOrder.paymentMethod}
              </Badge>
            </div>

            {/* Items breakdown */}
            <div className="space-y-1.5 py-1">
              {completedOrder.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center text-ink-secondary"
                >
                  <span className="truncate pr-2">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-ink-primary shrink-0">
                    {formatReceipt(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="pt-2 border-t border-dashed border-divider space-y-1 text-ink-secondary">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-ink-primary">{formatReceipt(completedOrder.summary.subtotal)}</span>
              </div>
              {completedOrder.summary.discountAmount > 0 && (
                <div className="flex justify-between text-status-infoText">
                  <span>Discount</span>
                  <span>-{formatReceipt(completedOrder.summary.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({completedOrder.summary.taxRate * 100}%)</span>
                <span className="text-ink-primary">{formatReceipt(completedOrder.summary.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink-primary text-sm pt-1 border-t border-divider font-sans">
                <span>Total Paid</span>
                <span className="text-ink-primary font-mono">
                  {formatReceipt(completedOrder.summary.total)}
                </span>
              </div>

              {completedOrder.paymentMethod === "Cash" && (
                <>
                  <div className="flex justify-between text-ink-secondary pt-1">
                    <span>Cash Tendered</span>
                    <span>{formatReceipt(completedOrder.cashReceived || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-status-successText">
                    <span>Change Due</span>
                    <span>{formatReceipt(completedOrder.changeAmount || 0)}</span>
                  </div>
                </>
              )}
            </div>
            {receiptFooterNote && (
              <p className="text-center text-[10px] text-ink-secondary font-sans pt-1">
                {receiptFooterNote}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-status-dangerBg border border-status-dangerText/20 text-status-dangerText rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-status-dangerText" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-4 bg-surface-hover rounded-xl border border-divider flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-secondary font-medium">
                Total Amount Due
              </p>
              <p className="text-2xl font-bold text-ink-primary">
                {format(summary.total)}
              </p>
            </div>
            <Badge variant="primary" size="md">
              Register #1
            </Badge>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onSetPaymentMethod("card")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === "card"
                    ? "border-brand bg-brand-tint text-brand-tintText shadow-sm"
                    : "border-divider hover:bg-surface-hover text-ink-primary"
                }`}
              >
                <CreditCard size={24} />
                <span className="text-xs font-semibold">
                  Credit / Debit Card
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSetPaymentMethod("qris")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === "qris"
                    ? "border-brand bg-brand-tint text-brand-tintText shadow-sm"
                    : "border-divider hover:bg-surface-hover text-ink-primary"
                }`}
              >
                <QrCode size={24} />
                <span className="text-xs font-semibold">QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => onSetPaymentMethod("cash")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === "cash"
                    ? "border-brand bg-brand-tint text-brand-tintText shadow-sm"
                    : "border-divider hover:bg-surface-hover text-ink-primary"
                }`}
              >
                <Banknote size={24} />
                <span className="text-xs font-semibold">Cash</span>
              </button>
            </div>
          </div>

          {/* Cash Input if Cash Selected */}
          {paymentMethod === "cash" && (
            <div className="p-3 bg-surface-hover rounded-xl border border-divider space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-primary">
                  Cash Received ({currencyMeta.symbol})
                </label>
                {cashAmountDisplay > 0 && (
                  <span
                    className={`text-xs font-bold ${
                      !isCashInsufficient ? "text-status-successText" : "text-status-dangerText"
                    }`}
                  >
                    {!isCashInsufficient
                      ? `Change: ${formatDisplay(changeDueDisplay)}`
                      : `Short: ${formatDisplay(totalDisplay - cashAmountDisplay)}`}
                  </span>
                )}
              </div>
              <Input
                type="number"
                step={currencyMeta.fractionDigits === 0 ? "1" : "0.01"}
                min="0"
                placeholder="Enter cash given by customer..."
                value={cashTendered}
                onChange={(e) => onSetCashTendered(e.target.value)}
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {quickCashValues.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      onSetCashTendered(
                        val.toFixed(currencyMeta.fractionDigits),
                      )
                    }
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface border border-divider hover:bg-canvas text-ink-primary transition-colors shrink-0"
                  >
                    {formatDisplay(val)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 text-[11px] text-ink-secondary flex items-center gap-1.5">
            <Sparkles size={14} className="text-status-infoText" />
            <span>Customer loyalty points eligible on this order</span>
          </div>
        </div>
      )}
    </Modal>
  );
};
