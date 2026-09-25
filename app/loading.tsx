export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Loading page">
      <div className="skeleton title-skeleton" />
      <div className="metrics-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="skeleton metric-skeleton" key={i} />
        ))}
      </div>
      <div className="skeleton chart-skeleton" />
      <span className="sr-only">Loading workspace…</span>
    </div>
  );
}
