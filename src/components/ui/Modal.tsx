/**
 * Accessible modal dialog:
 * - rendered in a portal, with the rest of the app made inert
 * - focus moves inside on open, Tab/Shift+Tab are trapped, Escape closes
 * - focus returns to the element that opened it
 */
import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { getFocusable, nextTrapIndex } from '../../utils/focus';

interface ModalProps {
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

export function Modal({ labelledBy, describedBy, role = 'dialog', onClose, initialFocusRef, className = '', children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');

    const dialog = dialogRef.current;
    const first = initialFocusRef?.current ?? (dialog ? getFocusable(dialog)[0] : undefined);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable(dialog);
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const next = nextTrapIndex(items.length, active ? items.indexOf(active) : -1, event.shiftKey);
      const target = items[next];
      if (next !== -1 && target) {
        event.preventDefault();
        target.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      appRoot?.removeAttribute('inert');
      appRoot?.removeAttribute('aria-hidden');
      if (opener?.isConnected) opener.focus();
    };
    // Run once per open: the dialog manages focus for its whole lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="overlay">
      <div
        ref={dialogRef}
        className={`sheet ${className}`.trim()}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
