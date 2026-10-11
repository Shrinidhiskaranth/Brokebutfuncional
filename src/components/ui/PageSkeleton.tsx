/** Placeholder shown while a code-split page loads. Reserves space to avoid layout shift. */
export function PageSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}
