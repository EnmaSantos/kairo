export function LoadingState() {
  return (
    <div className="loading-layout" role="status" aria-label="Loading your journal">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <span className="sr-only">Loading your journal…</span>
    </div>
  );
}
