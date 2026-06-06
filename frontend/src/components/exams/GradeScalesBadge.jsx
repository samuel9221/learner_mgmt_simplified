// frontend/src/components/exams/GradeScaleBadge.jsx
// Usage: <GradeScaleBadge grade="A" color="#22c55e" size="md" />

const sizes = {
  sm: { width: 24, height: 24, fontSize: 11, borderRadius: 6 },
  md: { width: 32, height: 32, fontSize: 14, borderRadius: 8 },
  lg: { width: 44, height: 44, fontSize: 18, borderRadius: 10 },
};

export default function GradeScaleBadge({ grade = "N/A", color = "#9ca3af", size = "md", showLabel = false, label = "" }) {
  const s = sizes[size] || sizes.md;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.width,
        height: s.height,
        borderRadius: s.borderRadius,
        background: color,
        color: "#fff",
        fontWeight: 800,
        fontSize: s.fontSize,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}>
        {grade}
      </span>
      {showLabel && label && (
        <span style={{ fontSize: s.fontSize - 1, color: "#374151", fontWeight: 500 }}>{label}</span>
      )}
    </span>
  );
}