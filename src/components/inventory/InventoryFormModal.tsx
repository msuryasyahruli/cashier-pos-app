import React from "react";
import { Modal, Button, Input } from "../";
import { type InventoryFormState } from "./inventoryTypes";
import { useCurrency } from "../../hooks/useCurrency";

interface InventoryFormModalProps {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  submittingText: string;
  formData: InventoryFormState;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChangeField: (field: keyof InventoryFormState, value: string) => void;
  categories?: string[];
}

export const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  isOpen,
  title,
  submitLabel,
  submittingText,
  formData,
  submitting,
  onClose,
  onSubmit,
  onChangeField,
  categories = [],
}) => {
  const { currencyMeta, exchangeRate, format, fromDisplay } = useCurrency();
  const categoryOptions = categories;
  const isSubmitDisabled =
    submitting ||
    !formData.sku ||
    !formData.name ||
    !formData.category ||
    !formData.price;

  const enteredPriceNum = parseFloat(formData.price);
  const hasValidPrice = Number.isFinite(enteredPriceNum) && enteredPriceNum > 0;
  const convertedBaseIdr = hasValidPrice ? fromDisplay(enteredPriceNum) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={isSubmitDisabled}>
            {submitting ? submittingText : submitLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <Input
            label="SKU"
            placeholder="SKU (e.g. COF-003)"
            value={formData.sku}
            onChange={(e) => onChangeField("sku", e.target.value)}
          />
        </div>
        <div>
          <Input
            label="Product Name"
            placeholder="Product Name"
            value={formData.name}
            onChange={(e) => onChangeField("name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Category
          </label>
          <select
            className="w-full border border-divider bg-surface rounded-xl px-3 py-2 text-xs text-ink-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring"
            value={formData.category}
            onChange={(e) => onChangeField("category", e.target.value)}
          >
            <option value="">Select category</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Input
            label={`Price (${currencyMeta.code} - ${currencyMeta.symbol})`}
            placeholder={`Price in ${currencyMeta.code}`}
            type="number"
            min="0"
            step={currencyMeta.fractionDigits === 0 ? "1" : "0.01"}
            value={formData.price}
            onChange={(e) => onChangeField("price", e.target.value)}
            helperText={
              currencyMeta.code !== "IDR" && hasValidPrice
                ? `Saved in base IDR: Rp ${Math.round(convertedBaseIdr).toLocaleString("id-ID")} (1 ${currencyMeta.code} = Rp ${exchangeRate.toLocaleString("id-ID")}) • Display: ${format(convertedBaseIdr)}`
                : undefined
            }
          />
        </div>
        <div>
          <Input
            label="Stock Quantity"
            placeholder="Stock"
            type="number"
            value={formData.stock}
            onChange={(e) => onChangeField("stock", e.target.value)}
          />
        </div>
        <div>
          <Input
            label="Low Stock Threshold"
            placeholder="Low Stock Threshold"
            type="number"
            value={formData.low_stock_threshold}
            onChange={(e) =>
              onChangeField("low_stock_threshold", e.target.value)
            }
          />
        </div>
        <div>
          <Input
            label="Barcode"
            placeholder="Barcode (optional)"
            type="text"
            inputMode="numeric"
            value={formData.barcode}
            onChange={(e) => onChangeField("barcode", e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
