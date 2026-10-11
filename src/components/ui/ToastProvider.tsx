import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from './toastContext';
import type { ShowToast, ToastOptions } from './toastContext';

const TOAST_MS = 5000;

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

/** Announces short confirmations through a polite live region, with optional Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback<ShowToast>((message, options = {}) => {
    counter.current += 1;
    setToast({ id: counter.current, message, ...options });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
          {toast && (
            <div className="toast" key={toast.id}>
              <p>{toast.message}</p>
              {toast.onUndo && (
                <button
                  type="button"
                  className="toast-btn"
                  onClick={() => {
                    toast.onUndo?.();
                    setToast({ id: toast.id + 1000, message: 'Undone.' });
                  }}
                >
                  Undo
                </button>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
