import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface PageHeadingProps {
  children: ReactNode;
  subtitle?: string;
  /** Move focus here after in-app navigation, so screen readers announce the new page. */
  focusOnMount: boolean;
}

export function PageHeading({ children, subtitle, focusOnMount }: PageHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  return (
    <header className="page-h">
      <h1 ref={ref} tabIndex={-1}>
        {children}
      </h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </header>
  );
}
