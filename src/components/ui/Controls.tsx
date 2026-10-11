/** Small accessible controls: on/off switch and toggle chip. */
import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  label: string;
  onChange: () => void;
  id?: string;
}

/** A real button with role="switch", so it works with Space/Enter and screen readers. */
export function Switch({ checked, label, onChange, id }: SwitchProps) {
  return (
    <button type="button" id={id} className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} />
  );
}

interface ChipProps {
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}

/** Toggle-style chip; aria-pressed tells assistive tech which one is selected. */
export function Chip({ children, pressed, disabled = false, onClick, label }: ChipProps) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
