import React from "react";
import { Modal, Button, Badge } from "../";
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
import type { StoredTransactionDetail } from "../../lib/transactionStorage";
import { formatDate } from "./transactionHelpers";

interface TransactionDetailModalProps {
  selectedTx: TransactionItem | null;
  txDetail: StoredTransactionDetail | null;
  onClose: () => void;
  onRefund: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  selectedTx,
  txDetail,
  onClose,
  onRefund,
}) => {
  return (
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
            disabled={!selectedTx}
          >
            Print Receipt
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={onRefund}
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
            <div className="py-8 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
              <RefreshCw size={18} className="animate-spin text-indigo-600" />
              <span>Loading transaction details...</span>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 font-mono text-xs">
                {/* Order Header */}
                <div className="flex justify-between items-start pb-3 border-b border-dashed border-slate-300">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-sans">
                      {selectedTx.order_number}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-sans">
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
                <div className="space-y-1.5 py-1 text-slate-700 font-sans">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Cashier Terminal</span>
                    <span className="font-semibold">
                      {selectedTx.cashier} (Register #1)
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="font-semibold">
                      {selectedTx.payment_method}
                    </span>
                  </div>
                </div>

                {/* Ordered Products Section */}
                <div className="pt-2 pb-1 border-t border-dashed border-slate-300 font-sans">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-indigo-600" />
                      Ordered Products ({txDetail.items.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedTx.items_count} items total
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono text-xs bg-white p-2.5 rounded-lg border border-slate-200/60">
                    {txDetail.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-slate-700"
                      >
                        <span className="truncate pr-2 font-sans font-medium text-slate-800">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-semibold text-slate-900 shrink-0">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary & Discount */}
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5 text-slate-600 font-sans">
                  <div className="flex justify-between font-mono">
                    <span className="font-sans">Subtotal</span>
                    <span>
                      ${(txDetail.subtotal || selectedTx.total).toFixed(2)}
                    </span>
                  </div>

                  {/* Discount percentage display */}
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Tag size={13} className="text-indigo-600" />
                      Discount ({txDetail.discountPercent}%)
                    </span>
                    {txDetail.discountPercent > 0 ? (
                      <span className="font-semibold text-emerald-600 font-mono">
                        -${txDetail.discountAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">
                        0% ($0.00)
                      </span>
                    )}
                  </div>

                  {txDetail.taxAmount > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="font-sans">Est. Tax (5%)</span>
                      <span>${txDetail.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900 font-sans">
                      Total Amount Paid
                    </span>
                    <span className="text-xl font-bold text-indigo-600 font-mono">
                      ${(Number(selectedTx.total) || 0).toFixed(2)}
                    </span>
                  </div>

                  {txDetail.cashReceived !== undefined &&
                    txDetail.cashReceived > 0 && (
                      <div className="pt-1 text-[11px] font-mono text-slate-500 flex justify-between">
                        <span>
                          Cash Tendered: $
                          {(txDetail.cashReceived || 0).toFixed(2)}
                        </span>
                        <span className="font-bold text-emerald-600">
                          Change: ${(txDetail.changeAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs">
                {selectedTx.status === "Completed" ? (
                  <CheckCircle2
                    size={16}
                    className="text-emerald-600 shrink-0"
                  />
                ) : (
                  <XCircle size={16} className="text-red-600 shrink-0" />
                )}
                <span>{selectedTx.status} Transaction</span>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
