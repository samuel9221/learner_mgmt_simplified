import { useState, useEffect } from "react";
import api from "../../services/api";

const get = (url) => api.get(url).then(r => r.data);

const EXAM_LABELS = {
  mid_term: { label: "Mid Term", weight: "40%", color: "#1d4ed8", bg: "#dbeafe" },
  end_of_term: { label: "End of Term", weight: "60%", color: "#15803d", bg: "#dcfce7" },
};

const emptyForm = {
  term_id: "",
  exam_type: "",
  start_date: "",
  end_date: "",
};

export default function ExamSessions() {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Load academic years ───────────────────────────────────
  useEffect(() => {
    get("/academic-years").then(d => {
      if (d.success) setAcademicYears(d.data);
    });
  }, []);

  // ── Load terms on year change ─────────────────────────────
  useEffect(() => {
    if (!selectedYear) { setTerms([]); setSelectedTerm(""); setSessions([]); return; }
    get(`/terms?academic_year_id=${selectedYear}`).then(d => {
      if (d.success) setTerms(d.data);
    });
    setSelectedTerm(""); setSessions([]);
  }, [selectedYear]);

  // ── Load sessions on term change ──────────────────────────
  const loadSessions = async (termId) => {
    if (!termId) { setSessions([]); return; }
    setLoading(true);
    setError("");
    try {
      const d = await get(`/exam-sessions/term/${termId}`);
      if (d.success) setSessions(d.data);
      else setError(d.message || "Failed to load exam sessions");
    } catch (err) {
      setSessions([]);
      setError(err.response?.data?.message || "Failed to load exam sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(selectedTerm); }, [selectedTerm]);

  // ── Flash ─────────────────────────────────────────────────
  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else { setError(msg); setTimeout(() => setError(""), 4000); }
  };

  // ── Open modals ───────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, term_id: selectedTerm });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditTarget(s.id);
    setForm({
      term_id: s.term_id,
      exam_type: s.exam_type,
      start_date: s.start_date ? s.start_date.slice(0, 10) : "",
      end_date: s.end_date ? s.end_date.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.term_id || !form.exam_type)
      return flash("error", "Term and exam type are required");

    setSaving(true);
    try {
      const body = editTarget
        ? { start_date: form.start_date, end_date: form.end_date }
        : form;

      const response = editTarget
        ? await api.put(`/exam-sessions/${editTarget}`, body)
        : await api.post("/exam-sessions", body);
      const data = response.data;

      if (data.success) {
        flash("success", editTarget ? "Session updated" : "Session created");
        setModalOpen(false);
        loadSessions(selectedTerm);
      } else {
        flash("error", data.message);
      }
    } catch {
      flash("error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────
  const handleToggle = async (id) => {
    const { data } = await api.patch(`/exam-sessions/${id}/toggle-active`);
    if (data.success) loadSessions(selectedTerm);
    else flash("error", data.message);
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const { data } = await api.delete(`/exam-sessions/${id}`);
      if (data.success) {
        flash("success", "Session deleted");
        loadSessions(selectedTerm);
      } else {
        flash("error", data.message);
      }
    } catch (err) {
      flash("error", err.response?.data?.message || "Delete failed");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ── What sessions exist for selected term ─────────────────
  const existingTypes = sessions.map(s => s.exam_type);
  const availableTypes = ["mid_term", "end_of_term"].filter(t => !existingTypes.includes(t));

  const selectedTermObj = terms.find(t => t.id === selectedTerm);

  // ─────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.topBar}>
        <div>
          <div style={S.breadcrumb}>Exams</div>
          <h1 style={S.title}>Exam Sessions</h1>
          <p style={S.subtitle}>
            Create Mid Term and End of Term exam sessions per term.
            Each session controls when teachers can enter scores.
          </p>
        </div>
        {selectedTerm && availableTypes.length > 0 && (
          <button style={S.btnPrimary} onClick={openCreate}>+ New Session</button>
        )}
      </div>

      {/* Alerts */}
      {error && <div style={S.alertError}>⚠ {error}</div>}
      {success && <div style={S.alertSuccess}>✓ {success}</div>}

      {/* Weight reminder */}
      <div style={S.infoBanner}>
        <span style={{ fontSize: 18 }}>⚖</span>
        <span>
          <strong>Mid Term</strong> scores carry <strong>40% weight</strong> &nbsp;·&nbsp;
          <strong>End of Term</strong> scores carry <strong>60% weight</strong> toward the final score.
        </span>
      </div>

      {/* Filters */}
      <div style={S.filterCard}>
        <div style={S.filterGrid}>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Academic Year</label>
            <select style={S.select} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Select year…</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.year_name}</option>
              ))}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Term</label>
            <select
              style={S.select}
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              disabled={!selectedYear}
            >
              <option value="">Select term…</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>Term {t.term_number}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {!selectedTerm ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <p style={{ color: "#6b7280" }}>Select an academic year and term to manage exam sessions.</p>
        </div>
      ) : loading ? (
        <div style={S.loadingWrap}><div style={S.spinner} /></div>
      ) : (
        <>
          {/* Term header */}
          <div style={S.termHeader}>
            <span style={S.termPill}>
              Term {selectedTermObj?.term_number} — {academicYears.find(y => y.id === selectedYear)?.year_name}
            </span>
            {sessions.length === 2 && (
              <span style={S.completePill}>✓ Both sessions created</span>
            )}
          </div>

          {/* Session cards */}
          <div style={S.sessionGrid}>
            {["mid_term", "end_of_term"].map(type => {
              const session = sessions.find(s => s.exam_type === type);
              const meta = EXAM_LABELS[type];
              return (
                <div key={type} style={{
                  ...S.sessionCard,
                  borderTop: `4px solid ${meta.color}`,
                  opacity: session && !session.is_active ? 0.75 : 1,
                }}>
                  {/* Card header */}
                  <div style={S.sessionCardTop}>
                    <div>
                      <span style={{ ...S.examTypeBadge, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      <div style={S.weightLabel}>Weight: {meta.weight} of final score</div>
                    </div>
                    {session && (
                      <span style={session.is_active ? S.statusActive : S.statusInactive}>
                        {session.is_active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>

                  {session ? (
                    <>
                      {/* Dates */}
                      <div style={S.dateRow}>
                        <div style={S.dateItem}>
                          <div style={S.dateLabel}>Start Date</div>
                          <div style={S.dateVal}>
                            {session.start_date
                              ? new Date(session.start_date).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </div>
                        </div>
                        <div style={{ ...S.dateItem, borderLeft: "1px solid #f3f4f6", paddingLeft: 20 }}>
                          <div style={S.dateLabel}>End Date</div>
                          <div style={S.dateVal}>
                            {session.end_date
                              ? new Date(session.end_date).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={S.cardActions}>
                        <button style={S.btnEdit} onClick={() => openEdit(session)}>Edit Dates</button>
                        <button
                          style={{ ...S.btnOutline, color: session.is_active ? "#dc2626" : "#16a34a" }}
                          onClick={() => handleToggle(session.id)}
                        >
                          {session.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button style={S.btnDanger} onClick={() => setDeleteConfirm(session)}>Delete</button>
                      </div>
                    </>
                  ) : (
                    <div style={S.emptySession}>
                      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
                        No {meta.label} session created yet for this term.
                      </p>
                      <button
                        style={{ ...S.btnPrimary, background: meta.color }}
                        onClick={() => {
                          setEditTarget(null);
                          setForm({ ...emptyForm, term_id: selectedTerm, exam_type: type });
                          setModalOpen(true);
                        }}
                      >
                        + Create {meta.label} Session
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* All sessions table (history) */}
          {sessions.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Session Details</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Exam Type", "Weight", "Start Date", "End Date", "Status", "Actions"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const meta = EXAM_LABELS[s.exam_type];
                    return (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td style={S.td}>
                          <span style={{ ...S.examTypeBadge, background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 700, color: meta.color }}>{meta.weight}</td>
                        <td style={S.td}>{s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}</td>
                        <td style={S.td}>{s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</td>
                        <td style={S.td}>
                          <span style={s.is_active ? S.statusActive : S.statusInactive}>
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={S.btnEdit} onClick={() => openEdit(s)}>Edit</button>
                            <button style={S.btnDanger} onClick={() => setDeleteConfirm(s)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Create/Edit Modal ── */}
      {modalOpen && (
        <div style={S.overlay} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>{editTarget ? "Edit Session Dates" : "Create Exam Session"}</h2>
              <button style={S.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            {!editTarget && (
              <div style={S.formGroup}>
                <label style={S.label}>Exam Type *</label>
                <select
                  style={S.input}
                  value={form.exam_type}
                  onChange={e => setForm({ ...form, exam_type: e.target.value })}
                >
                  <option value="">Select exam type…</option>
                  {(editTarget
                    ? ["mid_term", "end_of_term"]
                    : availableTypes
                  ).map(t => (
                    <option key={t} value={t}>{EXAM_LABELS[t].label} ({EXAM_LABELS[t].weight})</option>
                  ))}
                </select>
              </div>
            )}

            {editTarget && form.exam_type && (
              <div style={{ ...S.infoBanner, marginBottom: 20 }}>
                <span style={{
                  ...S.examTypeBadge,
                  background: EXAM_LABELS[form.exam_type].bg,
                  color: EXAM_LABELS[form.exam_type].color,
                }}>
                  {EXAM_LABELS[form.exam_type].label} — {EXAM_LABELS[form.exam_type].weight}
                </span>
              </div>
            )}

            <div style={S.formGrid}>
              <div style={S.formGroup}>
                <label style={S.label}>Start Date</label>
                <input
                  type="date"
                  style={S.input}
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>End Date</label>
                <input
                  type="date"
                  style={S.input}
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div style={S.modalFooter}>
              <button style={S.btnOutline} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={S.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={S.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...S.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>Delete Session</h2>
              <button style={S.closeBtn} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: "#374151", marginBottom: 8 }}>
              Delete the <strong>{EXAM_LABELS[deleteConfirm.exam_type]?.label}</strong> session?
            </p>
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 20 }}>
              This will also delete all exam results entered for this session. This cannot be undone.
            </p>
            <div style={S.modalFooter}>
              <button style={S.btnOutline} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                style={{ ...S.btnPrimary, background: "#ef4444" }}
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding: "28px 32px", maxWidth: 1000, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  breadcrumb: { fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, maxWidth: 520 },

  alertError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  alertSuccess: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  infoBanner: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13, display: "flex", gap: 10, alignItems: "center" },

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", fontFamily: "inherit" },

  emptyPrompt: { textAlign: "center", padding: "60px 20px", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" },
  loadingWrap: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  termHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  termPill: { background: "#f1f5f9", color: "#334155", padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 600 },
  completePill: { background: "#dcfce7", color: "#15803d", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 },

  sessionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 },
  sessionCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  sessionCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  examTypeBadge: { display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  weightLabel: { fontSize: 12, color: "#6b7280", marginTop: 6 },
  dateRow: { display: "flex", gap: 20 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  dateVal: { fontSize: 15, fontWeight: 600, color: "#111827" },
  cardActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  emptySession: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 0", textAlign: "center" },

  statusActive: { background: "#dcfce7", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusInactive: { background: "#f3f4f6", color: "#9ca3af", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#374151", padding: "14px 20px", borderBottom: "1px solid #f3f4f6" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "11px 16px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "12px 16px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 20, color: "#9ca3af", cursor: "pointer" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },

  btnPrimary: { padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnOutline: { padding: "9px 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnEdit: { padding: "6px 14px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 },
  btnDanger: { padding: "6px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 },
};
