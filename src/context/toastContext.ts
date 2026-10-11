import { createContext } from 'react';

export interface ToastOptions {
  /** Show an Undo button that calls this. */
  onUndo?: () => void;
}

export type ShowToast = (message: string, options?: ToastOptions) => void;

export const ToastContext = createContext<ShowToast | null>(null);
