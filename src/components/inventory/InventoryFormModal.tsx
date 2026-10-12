import React from "react";
import { Modal, Button, Input } from "../";
import { CATEGORIES, type InventoryFormState } from "./inventoryTypes";

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
}) => {
  const isSubmitDisabled =
    submitting ||
    !formData.sku ||
    !formData.name ||
    !formData.category ||
    !formData.price;

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
            placeholder="SKU (e.g. COF-003)"
            value={formData.sku}
            onChange={(e) => onChangeField("sku", e.target.value)}
          />
        </div>
        <div>
          <Input
            placeholder="Product Name"
            value={formData.name}
            onChange={(e) => onChangeField("name", e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={formData.category}
            onChange={(e) => onChangeField("category", e.target.value)}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Input
            placeholder="Price"
            type="number"
            value={formData.price}
            onChange={(e) => onChangeField("price", e.target.value)}
          />
        </div>
        <div>
          <Input
            placeholder="Stock"
            type="number"
            value={formData.stock}
            onChange={(e) => onChangeField("stock", e.target.value)}
          />
        </div>
        <div>
          <Input
            placeholder="Low Stock Threshold"
            type="number"
            value={formData.low_stock_threshold}
            onChange={(e) => onChangeField("low_stock_threshold", e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
