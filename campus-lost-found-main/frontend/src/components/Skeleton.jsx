export function SkeletonCard() {
  return (
    <div className="card" style={{ pointerEvents: "none" }}>
      <div
        className="skeleton"
        style={{
          height: 190,
          borderTopLeftRadius: "var(--radius-xl)",
          borderTopRightRadius: "var(--radius-xl)",
        }}
      ></div>
      <div style={{ padding: "var(--space-5)" }}>
        <div className="skeleton skeleton-text" style={{ width: "75%", marginBottom: 14 }}></div>
        <div className="skeleton skeleton-text-sm" style={{ width: "88%", marginBottom: 8 }}></div>
        <div className="skeleton skeleton-text-sm" style={{ width: "62%", marginBottom: 8 }}></div>
        <div className="skeleton skeleton-text-sm" style={{ width: "50%" }}></div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "var(--radius-md)" }}></div>
      </td>
      <td>
        <div className="skeleton skeleton-text" style={{ width: "80%" }}></div>
      </td>
      <td>
        <div className="skeleton skeleton-text" style={{ width: "60%" }}></div>
      </td>
      <td>
        <div className="skeleton skeleton-text" style={{ width: "50%" }}></div>
      </td>
    </tr>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
