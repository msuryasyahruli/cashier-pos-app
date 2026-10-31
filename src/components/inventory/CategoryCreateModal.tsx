import React, { useEffect, useState } from "react";
import { Modal, Button, Input } from "../";

interface CategoryCreateModalProps {
  isOpen: boolean;
  storeName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialName?: string;
  mode?: "create" | "edit";
}

export const CategoryCreateModal: React.FC<CategoryCreateModalProps> = ({
  isOpen,
  storeName,
  submitting,
  onClose,
  onSubmit,
  initialName = "",
  mode = "create",
}) => {
  const [name, setName] = useState(initialName);

  useEffect(() => setName(initialName), [initialName, isOpen]);

  const close = () => {
    setName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`${mode === "edit" ? "Edit" : "Create"} Category for ${storeName}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
          <Button
            size="sm"
            disabled={submitting || !name.trim()}
            onClick={async () => {
              await onSubmit(name);
              setName("");
            }}
          >
            {submitting
              ? mode === "edit" ? "Saving..." : "Creating..."
              : mode === "edit" ? "Save Category" : "Create Category"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          This category will only be available in {storeName}.
        </p>
        <Input
          label="Category name"
          placeholder="e.g. Seasonal Specials"
          value={name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim() && !submitting) {
              event.preventDefault();
              void onSubmit(name);
              setName("");
            }
          }}
        />
      </div>
    </Modal>
  );
};
