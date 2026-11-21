import React, { useState, useMemo, useCallback } from "react";
import { Modal, Button, Badge, ConfirmationModal } from "../";
import {
  Printer,
  XCircle,
  RefreshCw,
  Calendar,
  ShoppingBag,
  Tag,
  CheckCircle2,
} from "lucide-react";
import type { TransactionItem } from "../pos";
import type { StoredTransactionDetail } from "../../services/transactionStorage";
import { formatDate } from "../../utils/transactionHelpers";
import {
  formatCurrency,
  formatDisplayAmount,
  type CurrencyCode,
} from "../../utils/currency";
import {
  getTransactionCurrency,
  isLegacyUsdTransaction,
} from "../../services/transactionService";
import { useCurrency } from "../../hooks/useCurrency";

interface TransactionDetailModalProps {
  selectedTx: TransactionItem | null;
  txDetail: StoredTransactionDetail | null;
  storeName?: string;
  receiptFooterNote?: string;
  onClose: () => void;
  onRefund: () => void | Promise<void>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  selectedTx,
  txDetail,
  storeName = "Store",
  receiptFooterNote,
  onClose,
  onRefund,
}) => {
  const { currency: storeCurrency, exchangeRates } = useCurrency();
  const [isRefundConfirmationOpen, setIsRefundConfirmationOpen] =
    useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const txCurrencyInfo = useMemo(() => {
    if (!selectedTx) {
      return {
        currency: "IDR" as CurrencyCode,
        exchangeRate: 1,
        isLegacyUsd: false,
      };
    }
    const rowCurrency = selectedTx.currency || txDetail?.currency;
    const remembered = getTransactionCurrency(
      selectedTx.id,
      selectedTx.order_number,
      rowCurrency,
      selectedTx.exchange_rate ?? txDetail?.exchangeRate,
      storeCurrency,
      exchangeRates[storeCurrency],
    );
    const isLegacyUsd = isLegacyUsdTransaction(
      selectedTx.total,
      rowCurrency,
      remembered,
    );

    return {
      currency: isLegacyUsd ? ("USD" as CurrencyCode) : remembered.currency,
      exchangeRate: remembered.exchangeRate,
      isLegacyUsd,
    };
  }, [selectedTx, txDetail, storeCurrency, exchangeRates]);

  const formatTx = useCallback(
    (amount: number) => {
      if (txCurrencyInfo.isLegacyUsd) {
        return formatDisplayAmount(amount, "USD");
      }
      return formatCurrency(amount, txCurrencyInfo.currency, {
        [txCurrencyInfo.currency]: txCurrencyInfo.exchangeRate,
      });
    },
    [txCurrencyInfo],
  );

  const confirmRefund = async () => {
    setRefundSubmitting(true);
    await onRefund();
    setRefundSubmitting(false);
    setIsRefundConfirmationOpen(false);
  };

  return (
    <>
      <Modal
        isOpen={Boolean(selectedTx)}
        onClose={onClose}
        title="Transaction Details"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              icon={<Printer size={15} />}
              disabled={!selectedTx || !txDetail}
            >
              Print Receipt
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsRefundConfirmationOpen(true)}
                icon={<XCircle size={15} />}
                disabled={selectedTx?.status !== "Completed"}
              >
                Refund
              </Button>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedTx && (
          <div className="space-y-4">
            {!txDetail ? (
              <div className="py-8 text-center text-ink-secondary font-medium flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-brand" />
                <span>Loading transaction details...</span>
              </div>
            ) : (
              <>
                <div className="receipt-print-content p-4 bg-surface-hover rounded-xl border border-divider space-y-3 font-mono text-xs">
                  <div className="text-center pb-2 border-b border-dashed border-divider">
                    <h4 className="font-bold text-base text-ink-primary">
                      {storeName}
                    </h4>
                    <p className="text-[10px] text-ink-secondary font-sans">
                      Sales Receipt
                    </p>
                  </div>
                  {/* Order Header */}
                  <div className="flex justify-between items-start pb-3 border-b border-dashed border-divider">
                    <div>
                      <h3 className="text-base font-bold text-ink-primary font-sans">
                        {selectedTx.order_number}
                      </h3>
                      <p className="text-[11px] text-ink-secondary flex items-center gap-1 mt-0.5 font-sans">
                        <Calendar size={13} />
                        {formatDate(selectedTx.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        selectedTx.status === "Completed"
                          ? "success"
                          : selectedTx.status === "Refunded"
                            ? "danger"
                            : "warning"
                      }
                      size="md"
                    >
                      {selectedTx.status}
                    </Badge>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 py-1 text-ink-primary font-sans">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-ink-secondary">Cashier Terminal</span>
                      <span className="font-semibold">
                        {selectedTx.cashier} (Register #1)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-ink-secondary">Payment Method</span>
                      <span className="font-semibold">
                        {selectedTx.payment_method}
                      </span>
                    </div>
                  </div>

                  {/* Ordered Products Section */}
                  <div className="pt-2 pb-1 border-t border-dashed border-divider font-sans">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-ink-primary text-xs flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-brand" />
                        Ordered Products ({txDetail.items.length})
                      </span>
                      <span className="text-[10px] text-ink-secondary font-mono">
                        {selectedTx.items_count} items total
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs bg-surface p-2.5 rounded-lg border border-divider">
                      {txDetail.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-ink-secondary"
                        >
                          <span className="truncate pr-2 font-sans font-medium text-ink-primary">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold text-ink-primary shrink-0">
                            {formatTx(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary & Discount */}
                  <div className="pt-2 border-t border-dashed border-divider space-y-1.5 text-ink-secondary font-sans">
                    <div className="flex justify-between font-mono">
                      <span className="font-sans">Subtotal</span>
                      <span className="text-ink-primary">
                        {formatTx(txDetail.subtotal || selectedTx.total)}
                      </span>
                    </div>

                    {/* Discount percentage display */}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1 text-ink-primary">
                        <Tag size={13} className="text-status-infoText" />
                        Discount ({txDetail.discountPercent}%)
                      </span>
                      {txDetail.discountPercent > 0 ? (
                        <span className="font-semibold text-status-infoText font-mono">
                          -{formatTx(txDetail.discountAmount)}
                        </span>
                      ) : (
                        <span className="text-ink-secondary font-mono">
                          0% ({formatTx(0)})
                        </span>
                      )}
                    </div>

                    {txDetail.taxAmount > 0 && (
                      <div className="flex justify-between font-mono">
                        <span className="font-sans">
                          Tax ({Number(txDetail.taxRatePercent.toFixed(2))}%)
                        </span>
                        <span className="text-ink-primary">{formatTx(txDetail.taxAmount)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-divider flex justify-between items-baseline">
                      <span className="text-sm font-bold text-ink-primary font-sans">
                        Total Amount Paid
                      </span>
                      <span className="text-xl font-bold text-ink-primary font-mono">
                        {formatTx(Number(selectedTx.total) || 0)}
                      </span>
                    </div>

                    {txDetail.cashReceived !== undefined &&
                      txDetail.cashReceived > 0 && (
                        <div className="pt-1 text-[11px] font-mono text-ink-secondary flex justify-between">
                          <span>
                            Cash Tendered: {formatTx(txDetail.cashReceived || 0)}
                          </span>
                          <span className="font-bold text-status-successText">
                            Change: {formatTx(txDetail.changeAmount || 0)}
                          </span>
                        </div>
                      )}
                  </div>

                  {receiptFooterNote && (
                    <p className="text-center text-[10px] text-ink-secondary font-sans pt-1">
                      {receiptFooterNote}
                    </p>
                  )}
                </div>

                <div
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                    selectedTx.status === "Completed"
                      ? "bg-status-successBg border-status-successText/20 text-status-successText"
                      : selectedTx.status === "Refunded"
                        ? "bg-status-dangerBg border-status-dangerText/20 text-status-dangerText"
                        : "bg-status-warningBg border-status-warningText/20 text-status-warningText"
                  }`}
                >
                  {selectedTx.status === "Completed" ? (
                    <CheckCircle2
                      size={16}
                      className="text-status-successText shrink-0"
                    />
                  ) : (
                    <XCircle size={16} className="text-status-dangerText shrink-0" />
                  )}
                  <span>{selectedTx.status} Transaction</span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <ConfirmationModal
        isOpen={isRefundConfirmationOpen}
        title="Refund Transaction"
        message="Are you sure you want to refund this transaction? Stock will be restored and the transaction will be marked as refunded."
        confirmLabel="Refund Transaction"
        loading={refundSubmitting}
        onClose={() => {
          if (!refundSubmitting) setIsRefundConfirmationOpen(false);
        }}
        onConfirm={confirmRefund}
      />
    </>
  );
};
