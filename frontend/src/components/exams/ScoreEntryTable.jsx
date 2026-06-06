// frontend/src/components/exams/ScoreEntryTable.jsx
// Reusable score entry table — used by ExamEntry.jsx and anywhere else needed
// Props:
//   learners      : [{id, name, admission_number, gender, score, is_absent, saved}]
//   examType      : 'mid_term' | 'end_of_term'
//   onScoreChange : (idx, value) => void
//   onAbsentToggle: (idx) => void
//   readOnly      : boolean (default false)

const WEIGHT = { mid_term: 0.4, end_of_term: 0.6 };

export default function ScoreEntryTable({
  learners = [],
  examType = "mid_term",
  onScoreChange,
  onAbsentToggle,
  readOnly = false,
}) {
  const weight = WEIGHT[examType] ?? 0.4;

  if (!learners.length) {
    return (
      <div style={styles.empty}>No learners to display.</div>
    );
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Adm No</th>
            <th style={styles.th}>Learner Name</th>
            <th style={{ ...styles.th, textAlign: "center" }}>Gender</th>
            <th style={{ ...styles.th, textAlign: "center" }}>
              Score (/ 100) &nbsp;
              <span style={styles.weightNote}>
                × {(weight * 100).toFixed(0)}%
              </span>
            </th>
            <th style={{ ...styles.th, textAlign: "center" }}>Weighted</th>
            {!readOnly && <th style={{ ...styles.th, textAlign: "center" }}>Absent</th>}
            <th style={{ ...styles.th, textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l, idx) => {
            const weighted =
              !l.is_absent && l.score !== "" && l.score !== null
                ? (Number(l.score) * weight).toFixed(1)
                : null;

            const rowBg = l.is_absent ? "#fef2f2" : idx % 2 === 0 ? "#fff" : "#f9fafb";

            return (
              <tr key={l.id} style={{ background: rowBg }}>
                <td style={{ ...styles.td, color: "#9ca3af", width: 36 }}>{idx + 1}</td>
                <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 13 }}>
                  {l.admission_number}
                </td>
                <td style={{ ...styles.td, fontWeight: 500 }}>{l.name}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <span style={{
                    ...styles.genderBadge,
                    background: l.gender === "Male" ? "#dbeafe" : "#fce7f3",
                    color: l.gender === "Male" ? "#1d4ed8" : "#be185d",
                  }}>
                    {l.gender === "Male" ? "M" : "F"}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {l.is_absent ? (
                    <span style={styles.absentText}>Absent</span>
                  ) : readOnly ? (
                    <span style={styles.readOnlyScore}>{l.score ?? "—"}%</span>
                  ) : (
                    <div style={styles.scoreInputWrap}>
                      <input
                        type="number"
                        min={0} max={100} step={0.5}
                        value={l.score ?? ""}
                        onChange={e => onScoreChange?.(idx, e.target.value)}
                        style={{
                          ...styles.scoreInput,
                          borderColor:
                            l.score === "" || l.score === null ? "#fca5a5"
                            : l.score >= 80 ? "#86efac"
                            : l.score >= 50 ? "#fde68a"
                            : "#fca5a5",
                        }}
                        placeholder="0–100"
                      />
                      <span style={styles.pctLabel}>%</span>
                    </div>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: "center", fontWeight: 600, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
                  {weighted !== null ? `${weighted}%` : "—"}
                </td>
                {!readOnly && (
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <label style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={l.is_absent}
                        onChange={() => onAbsentToggle?.(idx)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </label>
                  </td>
                )}
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {l.is_absent ? (
                    <span style={styles.statusAbsent}>Absent</span>
                  ) : l.saved ? (
                    <span style={styles.statusSaved}>✓ Saved</span>
                  ) : l.score !== "" && l.score !== null ? (
                    <span style={styles.statusPending}>Pending</span>
                  ) : (
                    <span style={styles.statusEmpty}>Empty</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableWrap: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 14px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  weightNote: { background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 },
  td: { padding: "10px 14px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  genderBadge: { display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 },
  scoreInputWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  scoreInput: { width: 76, padding: "7px 10px", border: "2px solid", borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums", fontFamily: "inherit" },
  pctLabel: { fontSize: 13, color: "#9ca3af", fontWeight: 600 },
  absentText: { color: "#ef4444", fontStyle: "italic", fontSize: 13 },
  readOnlyScore: { fontWeight: 700, fontSize: 15, color: "#111827" },
  statusSaved: { background: "#dcfce7", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusPending: { background: "#fef9c3", color: "#a16207", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusEmpty: { background: "#fee2e2", color: "#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusAbsent: { background: "#f3f4f6", color: "#6b7280", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  empty: { padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 },
};