/** Decorative inline SVG icons: hidden from assistive tech and never focusable. */
import type { ReactNode } from 'react';

const PATHS = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  afford: (
    <>
      <path d="M6 7h12l-1.5 12h-9z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
      <path d="M10.5 13.5 12 15l2.5-3" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h12v4" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13.5h2" />
    </>
  ),
  logo: <path d="M7 5h10M7 9.5h10M7 5c5 0 5 4.5 0 4.5L15 19" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  food: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M9 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3" />
    </>
  ),
  travel: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="3" />
      <path d="M4 11h16M7 20l1.5-4M17 20l-1.5-4" />
    </>
  ),
  fun: <path d="M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />,
  shopping: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  other: (
    <>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </>
  ),
  bill: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5h5" />
    </>
  ),
  piggy: <path d="M5 11a6 5 0 0 1 11-2h2l1 2v3l-2 1-1 3h-2v-2h-4v2H8l-1-3a4 4 0 0 1-2-4z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
