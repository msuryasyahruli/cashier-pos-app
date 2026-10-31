import React, { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Input } from "../Input";
import { Store, Loader2, AlertCircle } from "lucide-react";
import { useStore } from "../../context/StoreContext";

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
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("Store name is required.");
      return;
    }

    const created = await createStore({
      name: name.trim(),
      branch_code: branchCode.trim() || undefined,
      receipt_footer_note: receiptFooterNote.trim() || undefined,
      default_sales_tax_rate: parseFloat(taxRate) || 0,
    });

    if (created) {
      setName("");
      setBranchCode("");
      setReceiptFooterNote("");
      setTaxRate("5.0");
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Up Your Store"
    >
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
