import { useId, useRef } from 'react';
import { Modal } from '../ui/Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation for destructive actions. Focus starts on Cancel, the safe choice. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const uid = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal role="alertdialog" labelledBy={`${uid}-t`} describedBy={`${uid}-m`} onClose={onClose} initialFocusRef={cancelRef}>
      <h2 id={`${uid}-t`}>{title}</h2>
      <p id={`${uid}-m`}>{message}</p>
      <div className="two">
        <button ref={cancelRef} type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn ink" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
