import { useContext } from 'react';
import { ToastContext } from '../context/toastContext';
import type { ShowToast } from '../context/toastContext';

/** Show a short confirmation (with optional Undo) in the live region. */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
