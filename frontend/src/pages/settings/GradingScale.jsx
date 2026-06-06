import { useState, useEffect } from "react";
import api from "../../services/api";

const API = "/grading-scales";

const DEFAULT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const emptyForm = {
  label: "",
  grade_name: "",
  min_score: "",
  max_score: "",
  remarks: "",
  color_code: "#3b82f6",
  is_active: true,
};

export default function GradingScale() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  // ── Fetch ────────────────────────────────────────────────
  const fetchScales = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API);
      if (data.success) setScales(data.data);
      else setError(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load grading scales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScales(); }, []);

  // ── Flash messages ────────────────────────────────────────
  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else { setError(msg); setTimeout(() => setError(""), 4000); }
  };

  // ── Open modal ────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (scale) => {
    setEditTarget(scale.id);
    setForm({
      label: scale.label,
      grade_name: scale.grade_name,
      min_score: scale.min_score,
      max_score: scale.max_score,
      remarks: scale.remarks || "",
      color_code: scale.color_code || "#3b82f6",
      is_active: scale.is_active,
    });
    setModalOpen(true);
  };

  // ── Save (create or update) ───────────────────────────────
  const handleSave = async () => {
    const { label, grade_name, min_score, max_score } = form;
    if (!label || !grade_name || min_score === "" || max_score === "")
      return flash("error", "Label, name, min and max score are required");
    if (Number(min_score) >= Number(max_score))
      return flash("error", "Min score must be less than max score");

    setSaving(true);
    try {
      const url = editTarget ? `${API}/${editTarget}` : API;
      const payload = {
          ...form,
          min_score: Number(form.min_score),
          max_score: Number(form.max_score),
      };
      const response = editTarget ? await api.put(url, payload) : await api.post(url, payload);
      const data = response.data;
      if (data.success) {
        flash("success", editTarget ? "Grade scale updated" : "Grade scale created");
        setModalOpen(false);
        fetchScales();
      } else {
        flash("error", data.message);
      }
    } catch (err) {
      flash("error", err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const { data } = await api.delete(`${API}/${id}`);
      if (data.success) { flash("success", "Grade scale deleted"); fetchScales(); }
      else flash("error", data.message);
    } catch (err) {
      flash("error", err.response?.data?.message || "Delete failed");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ── Reset to defaults ─────────────────────────────────────
  const handleReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post(`${API}/reset/defaults`);
      if (data.success) { flash("success", "Grading scales reset to defaults"); fetchScales(); }
      else flash("error", data.message);
    } catch (err) {
      flash("error", err.response?.data?.message || "Reset failed");
    } finally {
      setResetting(false);
      setResetConfirm(false);
    }
  };

  // ── Coverage check ─────────────────────────────────────────
  const coverageGaps = () => {
    const active = [...scales]
      .filter(s => s.is_active)
      .sort((a, b) => a.min_score - b.min_score);
    const gaps = [];
    if (active.length && active[0].min_score > 0)
      gaps.push(`0 – ${active[0].min_score - 0.01}`);
    for (let i = 0; i < active.length - 1; i++) {
      if (active[i].max_score < active[i + 1].min_score - 0.01)
        gaps.push(`${active[i].max_score} – ${active[i + 1].min_score}`);
    }
    if (active.length && active[active.length - 1].max_score < 100)
      gaps.push(`${active[active.length - 1].max_score} – 100`);
    return gaps;
  };

  const gaps = coverageGaps();

  // ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.breadcrumb}>Settings</div>
          <h1 style={styles.title}>Grading Scale</h1>
          <p style={styles.subtitle}>
            Define grade boundaries used across all exams and reports.
            Scores are resolved against these ranges at report time.
          </p>
        </div>
        <div style={styles.topActions}>
          <button style={styles.btnOutline} onClick={() => setResetConfirm(true)}>
            ↺ Reset Defaults
          </button>
          <button style={styles.btnPrimary} onClick={openCreate}>
            + Add Grade
          </button>
        </div>
      </div>

      {/* ── Flash messages ── */}
      {error && <div style={styles.alertError}><span>⚠</span> {error}</div>}
      {success && <div style={styles.alertSuccess}><span>✓</span> {success}</div>}

      {/* ── Coverage warning ── */}
      {gaps.length > 0 && (
        <div style={styles.coverageWarn}>
          <strong>⚠ Score range gap detected:</strong> The following score ranges are
          not covered by any active grade — {gaps.join(", ")}.
          Learners in these ranges will receive grade "N/A".
        </div>
      )}

      {/* ── Weight info banner ── */}
      <div style={styles.infoBanner}>
        <div style={styles.infoBannerIcon}>ℹ</div>
        <div>
          <strong>Weighted Scoring</strong> — Teachers enter scores out of 100%.
          The system applies <strong>40% weight to Mid Term</strong> and{" "}
          <strong>60% weight to End of Term</strong> when computing the final score.
          Grades below are assigned based on the computed final score.
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={{ color: "#6b7280", marginTop: 12 }}>Loading grading scales…</span>
        </div>
      ) : (
        <div style={styles.card}>
          {scales.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <p>No grading scales configured yet.</p>
              <button style={styles.btnPrimary} onClick={openCreate}>Add First Grade</button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Grade", "Name", "Score Range", "Description", "Status", "Actions"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scales.map((scale, i) => (
                  <tr key={scale.id} style={{ ...styles.tr, background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={styles.td}>
                      <span style={{ ...styles.gradeBadge, background: scale.color_code || "#6b7280" }}>
                        {scale.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{scale.grade_name}</td>
                    <td style={styles.td}>
                      <span style={styles.rangeChip}>
                        {scale.min_score}% – {scale.max_score}%
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: "#6b7280", fontSize: 13 }}>
                      {scale.remarks || "—"}
                    </td>
                    <td style={styles.td}>
                      <span style={scale.is_active ? styles.statusActive : styles.statusInactive}>
                        {scale.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionRow}>
                        <button style={styles.btnEdit} onClick={() => openEdit(scale)}>Edit</button>
                        <button style={styles.btnDelete} onClick={() => setDeleteConfirm(scale)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Visual scale bar ── */}
      {scales.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Score Range Visualisation</h3>
          <div style={styles.scaleBar}>
            {[...scales]
              .filter(s => s.is_active)
              .sort((a, b) => b.min_score - a.min_score)
              .map(s => (
                <div
                  key={s.id}
                  style={{
                    ...styles.scaleSegment,
                    flex: s.max_score - s.min_score,
                    background: s.color_code || "#6b7280",
                  }}
                  title={`${s.label}: ${s.min_score}–${s.max_score}%`}
                >
                  <span style={styles.scaleLabel}>{s.label}</span>
                  <span style={styles.scaleRange}>{s.min_score}–{s.max_score}</span>
                </div>
              ))}
          </div>
          <div style={styles.scaleAxisLabels}>
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {modalOpen && (
        <div style={styles.overlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editTarget ? "Edit Grade Scale" : "Add Grade Scale"}
              </h2>
              <button style={styles.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Grade Label *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. A"
                  maxLength={5}
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value.toUpperCase() })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Grade Name *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Excellent"
                  value={form.grade_name}
                  onChange={e => setForm({ ...form, grade_name: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Min Score (%) *</label>
                <input
                  style={styles.input}
                  type="number" min={0} max={100} step={0.01}
                  placeholder="e.g. 80"
                  value={form.min_score}
                  onChange={e => setForm({ ...form, min_score: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Max Score (%) *</label>
                <input
                  style={styles.input}
                  type="number" min={0} max={100} step={0.01}
                  placeholder="e.g. 100"
                  value={form.max_score}
                  onChange={e => setForm({ ...form, max_score: e.target.value })}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description / Remarks</label>
              <input
                style={styles.input}
                placeholder="e.g. Outstanding performance"
                value={form.remarks}
                onChange={e => setForm({ ...form, remarks: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Badge Color</label>
              <div style={styles.colorRow}>
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    style={{
                      ...styles.colorSwatch,
                      background: c,
                      outline: form.color_code === c ? "3px solid #1e293b" : "none",
                    }}
                    onClick={() => setForm({ ...form, color_code: c })}
                  />
                ))}
                <input
                  type="color"
                  value={form.color_code}
                  onChange={e => setForm({ ...form, color_code: e.target.value })}
                  style={styles.colorPicker}
                  title="Custom color"
                />
                <span style={styles.colorPreview}>
                  <span style={{ ...styles.gradeBadge, background: form.color_code }}>
                    {form.label || "A"}
                  </span>
                </span>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14 }}>Active — used in grading and reports</span>
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Grade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Delete Grade Scale</h2>
              <button style={styles.closeBtn} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: "#374151", marginBottom: 8 }}>
              Are you sure you want to delete the{" "}
              <strong>"{deleteConfirm.label} — {deleteConfirm.grade_name}"</strong> grade scale?
            </p>
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 20 }}>
              This cannot be undone. Learners whose scores fall in this range will receive grade "N/A".
            </p>
            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                style={{ ...styles.btnPrimary, background: "#ef4444" }}
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Confirm ── */}
      {resetConfirm && (
        <div style={styles.overlay} onClick={() => setResetConfirm(false)}>
          <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Reset to Defaults</h2>
              <button style={styles.closeBtn} onClick={() => setResetConfirm(false)}>✕</button>
            </div>
            <p style={{ color: "#374151", marginBottom: 8 }}>
              This will <strong>delete all current grading scales</strong> and restore the system defaults:
            </p>
            <div style={styles.defaultsList}>
              {[
                { label: "A", name: "Excellent", range: "80–100%", color: "#22c55e" },
                { label: "B", name: "Good", range: "65–79.99%", color: "#3b82f6" },
                { label: "C", name: "Satisfactory", range: "50–64.99%", color: "#f59e0b" },
                { label: "D", name: "Below Average", range: "0–49.99%", color: "#ef4444" },
              ].map(d => (
                <div key={d.label} style={styles.defaultRow}>
                  <span style={{ ...styles.gradeBadge, background: d.color }}>{d.label}</span>
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>{d.range}</span>
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setResetConfirm(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleReset} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset to Defaults"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { padding: "28px 32px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 },
  breadcrumb: { fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, maxWidth: 560 },
  topActions: { display: "flex", gap: 10, alignItems: "center", flexShrink: 0 },

  alertError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", fontSize: 14 },
  alertSuccess: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "10px 16px", borderRadius: 8, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", fontSize: 14 },

  coverageWarn: { background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.6 },
  infoBanner: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.6, display: "flex", gap: 12, alignItems: "flex-start" },
  infoBannerIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#374151", padding: "16px 20px", borderBottom: "1px solid #f3f4f6", margin: 0 },

  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  tr: { transition: "background 0.15s" },
  td: { padding: "13px 16px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },

  gradeBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 0.5 },
  rangeChip: { background: "#f1f5f9", color: "#334155", padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  statusActive: { background: "#dcfce7", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusInactive: { background: "#f3f4f6", color: "#9ca3af", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionRow: { display: "flex", gap: 8 },
  btnEdit: { padding: "5px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  btnDelete: { padding: "5px 14px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 13, cursor: "pointer", fontWeight: 500 },

  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  emptyState: { padding: 60, textAlign: "center", color: "#6b7280" },
  emptyIcon: { fontSize: 40, marginBottom: 12 },

  scaleBar: { display: "flex", height: 52, margin: "16px 20px 0", borderRadius: 8, overflow: "hidden", gap: 2 },
  scaleSegment: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", transition: "flex 0.4s ease", minWidth: 32 },
  scaleLabel: { fontWeight: 800, fontSize: 15 },
  scaleRange: { fontSize: 10, opacity: 0.85 },
  scaleAxisLabels: { display: "flex", justifyContent: "space-between", padding: "6px 20px 16px", fontSize: 11, color: "#9ca3af" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 20, color: "#9ca3af", cursor: "pointer", padding: "0 4px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },

  colorRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  colorSwatch: { width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", transition: "transform 0.1s", outlineOffset: 2 },
  colorPicker: { width: 36, height: 28, border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", padding: 2 },
  colorPreview: { marginLeft: 8 },

  toggleRow: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },

  btnPrimary: { padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnOutline: { padding: "9px 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },

  defaultsList: { display: "flex", flexDirection: "column", gap: 8, margin: "12px 0 20px", padding: "12px 16px", background: "#f8fafc", borderRadius: 8 },
  defaultRow: { display: "flex", alignItems: "center", gap: 12 },
};
