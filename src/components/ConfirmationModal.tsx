import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onClose,
  onConfirm,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={
      <>
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" size="sm" onClick={() => void onConfirm()} disabled={loading}>
          {loading ? "Working..." : confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
        <AlertTriangle size={20} />
      </div>
      <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  </Modal>
);
