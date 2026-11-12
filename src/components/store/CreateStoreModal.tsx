import React, { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Input } from "../Input";
import { Store, Loader2, AlertCircle } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
  getCurrencyMeta,
  type CurrencyCode,
} from "../../utils/currency";

export interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createStore, saving } = useStore();
  const [name, setName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [receiptFooterNote, setReceiptFooterNote] = useState("");
  const [taxRate, setTaxRate] = useState("5.0");
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rateInput, setRateInput] = useState("1");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCurrencyChange = (nextCode: CurrencyCode) => {
    setCurrency(nextCode);
    setRateInput(String(getCurrencyMeta(nextCode).defaultRateInIdr));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("Store name is required.");
      return;
    }

    const parsedRate = parseFloat(rateInput);
    const validRate =
      currency === "IDR"
        ? 1
        : Number.isFinite(parsedRate) && parsedRate > 0
          ? parsedRate
          : getCurrencyMeta(currency).defaultRateInIdr;

    const created = await createStore({
      name: name.trim(),
      branch_code: branchCode.trim() || undefined,
      receipt_footer_note: receiptFooterNote.trim() || undefined,
      default_sales_tax_rate: parseFloat(taxRate) || 0,
      currency,
      exchange_rates: {
        ...DEFAULT_EXCHANGE_RATES,
        [currency]: validRate,
        IDR: 1,
      },
    });

    if (created) {
      setName("");
      setBranchCode("");
      setReceiptFooterNote("");
      setTaxRate("5.0");
      setCurrency(DEFAULT_CURRENCY);
      setRateInput("1");
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Up Your Store">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
          <Store size={20} className="shrink-0 text-indigo-600" />
          <span>
            Create a store to manage products, track inventory, and take orders
            tailored to this location.
          </span>
        </div>

        {localError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <div className="space-y-3">
          <Input
            label="Store Name *"
            placeholder="e.g. Downtown Coffee Lounge"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Branch Code"
            placeholder="e.g. STR-01"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value)}
          />

          <Input
            label="Default Sales Tax Rate (%)"
            type="number"
            placeholder="e.g. 5.0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="modal-store-currency"
                className="text-xs font-semibold text-slate-700"
              >
                Currency
              </label>
              <select
                id="modal-store-currency"
                value={currency}
                onChange={(e) =>
                  handleCurrencyChange(e.target.value as CurrencyCode)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={
                currency === "IDR"
                  ? "Rate (Base IDR)"
                  : `1 ${currency} in IDR`
              }
              type="number"
              min="0.0001"
              step="any"
              value={currency === "IDR" ? "1" : rateInput}
              disabled={currency === "IDR"}
              onChange={(e) => setRateInput(e.target.value)}
            />
          </div>

          <Input
            label="Receipt Footer Note"
            placeholder="e.g. Thank you for your visit! See you again."
            value={receiptFooterNote}
            onChange={(e) => setReceiptFooterNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            icon={
              saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Store size={16} />
              )
            }
          >
            {saving ? "Creating Store..." : "Create Store"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
