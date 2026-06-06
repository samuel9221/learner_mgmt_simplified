import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const get = async (url) => {
  const response = await api.get(url);
  return response.data;
};
const post = async (url) => {
  const response = await api.post(url);
  return response.data;
};
const blobMessage = async (blob) => {
  const text = await blob.text().catch(() => "");
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || text;
  } catch {
    return text.slice(0, 240);
  }
};

const GRADE_COLORS = {
  A: { bg: "#dcfce7", color: "#15803d" },
  B: { bg: "#dbeafe", color: "#1d4ed8" },
  C: { bg: "#fef9c3", color: "#a16207" },
  D: { bg: "#fee2e2", color: "#dc2626" },
  "N/A": { bg: "#f3f4f6", color: "#9ca3af" },
};

const gradeStyle = (grade) => GRADE_COLORS[grade] || GRADE_COLORS["N/A"];

export default function FinalResults() {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [streams, setStreams] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [preferredTermId, setPreferredTermId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [viewMode, setViewMode] = useState("table"); // table | learner
  const [selectedLearner, setSelectedLearner] = useState(null);

  useEffect(() => {
    let active = true;

    const loadInitialFilters = async () => {
      setError("");
      try {
        const [yearsRes, currentTermRes] = await Promise.all([
          get("/academic-years"),
          get("/terms/current").catch(() => ({ success: false })),
        ]);

        if (!active) return;

        const years = yearsRes.success && Array.isArray(yearsRes.data) ? yearsRes.data : [];
        const currentTerm = currentTermRes.success ? currentTermRes.data : null;
        const currentYear = years.find(y => y.is_current);
        const initialYearId = currentTerm?.academic_year_id || currentYear?.id || years[0]?.id || "";

        setAcademicYears(years);
        setPreferredTermId(currentTerm?.id || "");
        setSelectedYear(initialYearId);
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message || "Failed to load academic years");
      }
    };

    loadInitialFilters();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setTerms([]);
      setStreams([]);
      setSelectedTerm("");
      setSelectedStream("");
      return;
    }

    let active = true;

    const loadYearFilters = async () => {
      setError("");
      try {
        const [termsRes, streamsRes] = await Promise.all([
          get(`/terms?academic_year_id=${selectedYear}`),
          get(`/streams?academic_year_id=${selectedYear}`),
        ]);

        if (!active) return;

        const yearTerms = termsRes.success && Array.isArray(termsRes.data) ? termsRes.data : [];
        const yearStreams = streamsRes.success && Array.isArray(streamsRes.data) ? streamsRes.data : [];
        const preferredTerm = yearTerms.find(t => String(t.id) === String(preferredTermId));
        const currentTerm = yearTerms.find(t => t.is_current);

        setTerms(yearTerms);
        setStreams(yearStreams);
        setSelectedStream("");
        setSelectedTerm(previousTerm => (
          yearTerms.some(t => String(t.id) === String(previousTerm))
            ? previousTerm
            : (preferredTerm?.id || currentTerm?.id || "")
        ));
        setPreferredTermId("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message || "Failed to load terms and streams");
      }
    };

    loadYearFilters();
    return () => { active = false; };
  }, [selectedYear, preferredTermId]);

  const normalizeResult = (row) => ({
    ...row,
    learner_name: row.learner_name || [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
    mid_term_score: row.mid_term_score == null ? null : Number(row.mid_term_score),
    end_term_score: row.end_term_score == null ? null : Number(row.end_term_score),
    final_score: row.final_score == null ? null : Number(row.final_score),
  });

  const loadResults = useCallback(async () => {
    if (!selectedTerm || !selectedStream) {
      setResults([]);
      return;
    }
    setLoading(true); setError("");
    try {
      const d = await get(`/final-results/term/${selectedTerm}/stream/${selectedStream}`);
      if (d.success) {
        setResults(Array.isArray(d.data) ? d.data.map(normalizeResult) : []);
      } else {
        setResults([]);
        setError(d.message || "Failed to load results");
      }
    } catch (e) {
      setResults([]);
      setError(e.response?.data?.message || e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedStream]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else { setError(msg); setTimeout(() => setError(""), 4000); }
  };

  // ── Recompute for term ─────────────────────────────────────
  const handleCompute = async () => {
    if (!selectedTerm) return;
    setComputing(true);
    try {
      const data = await post(`/final-results/compute/term/${selectedTerm}`);
      if (data.success) {
        flash("success", `${data.message}. ${data.count ?? 0} mark records processed.`);
        loadResults();
      } else flash("error", data.message || "Failed to compute final results");
    } catch (e) {
      flash("error", e.response?.data?.message || e.message || "Failed to compute final results");
    } finally {
      setComputing(false);
    }
  };

  // ── Derived: pivot by learner ─────────────────────────────
  const safeResults = Array.isArray(results) ? results : [];
  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYear));
  const selectedTermObj = terms.find(t => String(t.id) === String(selectedTerm));
  const selectedStreamObj = streams.find(s => String(s.id) === String(selectedStream));

  const learnerMap = {};
  for (const r of safeResults) {
    if (!learnerMap[r.learner_id]) {
      learnerMap[r.learner_id] = {
        learner_id: r.learner_id,
        admission_number: r.admission_number,
        learner_name: r.learner_name,
        gender: r.gender,
        stream_rank: r.stream_rank,
        class_rank: r.class_rank,
        subjects: [],
      };
    }
    learnerMap[r.learner_id].subjects.push(r);
  }
  const learners = Object.values(learnerMap).sort((a, b) => (a.stream_rank || 999) - (b.stream_rank || 999));

  // ── Unique subjects ────────────────────────────────────────
  //const subjectList = [...new Map(results.map(r => [r.subject_id, { id: r.subject_id, name: r.subject_name }])).values()];
  //const safeResults = Array.isArray(results) ? results : [];
  const subjectList = [...new Map(safeResults.map(r => [r.subject_id, { id: r.subject_id, name: r.subject_name }])).values()];
  const scoredResults = safeResults.filter(r => r.final_score !== null && !Number.isNaN(r.final_score));
  const averageScore = (rows) => {
    const scored = rows.filter(r => r.final_score !== null && !Number.isNaN(r.final_score));
    if (!scored.length) return null;
    return scored.reduce((a, r) => a + r.final_score, 0) / scored.length;
  };
  // ── Filter by search ───────────────────────────────────────
  const filtered = learners.filter(l =>
    l.learner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Learner detail view ────────────────────────────────────
  const learnerDetail = selectedLearner ? learnerMap[selectedLearner] : null;

  const isReady = selectedTerm && selectedStream;
  const contextLabel = [
    selectedYearObj?.year_name,
    selectedTermObj?.term_number ? `Term ${selectedTermObj.term_number}` : null,
    selectedStreamObj?.class_name,
    selectedStreamObj?.stream_name,
  ].filter(Boolean).join(" / ");

  const downloadPdf = async (url, filename) => {
    try {
      const response = await api.get(url, { responseType: "blob", timeout: 120000 });
      const contentType = response.headers?.["content-type"] || response.data?.type || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error(await blobMessage(response.data) || "The server did not return a PDF file.");
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      flash("success", "PDF downloaded.");
    } catch (e) {
      const message = e.response?.data instanceof Blob ? await blobMessage(e.response.data) : e.response?.data?.message;
      flash("error", message || e.message || "Failed to download PDF");
    }
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.topBar}>
        <div>
          <div style={S.breadcrumb}>Results</div>
          <h1 style={S.title}>Final Results</h1>
          <p style={S.subtitle}>
            Final scores are computed from marks saved in the database: Mid Term (40%) + End of Term (60%).
            Recompute after all scores are entered.
          </p>
          {contextLabel && <div style={S.contextPill}>{contextLabel}</div>}
        </div>
        {isReady && (
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btnOutline} onClick={handleCompute} disabled={computing}>
              {computing ? "Computing…" : "⟳ Recompute"}
            </button>
            <button
              style={{ ...S.btnPrimary, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => downloadPdf(`/reports/stream/${selectedStream}/term/${selectedTerm}/pdf?mode=combined`, `${contextLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_combined.pdf`)}
            >
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && <div style={S.alertError}>⚠ {error}</div>}
      {success && <div style={S.alertSuccess}>✓ {success}</div>}

      {/* Filters */}
      <div style={S.filterCard}>
        <div style={S.filterGrid}>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Academic Year</label>
            <select style={S.select} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Select year…</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Term</label>
            <select style={S.select} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} disabled={!selectedYear}>
              <option value="">Select term…</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  Term {t.term_number}{t.is_current ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Stream</label>
            <select style={S.select} value={selectedStream} onChange={e => setSelectedStream(e.target.value)}>
              <option value="">Select stream…</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>
                  {[s.class_name, s.stream_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Search</label>
            <input
              style={S.select}
              placeholder="Name or admission no…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!isReady ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <p style={{ color: "#6b7280" }}>Select a term and stream to view final results.</p>
        </div>
      ) : loading ? (
        <div style={S.loadingWrap}><div style={S.spinner} /></div>
      ) : safeResults.length === 0 ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#6b7280", marginBottom: 16 }}>No final results yet. Make sure all exam scores are entered, then recompute.</p>
          <button style={S.btnPrimary} onClick={handleCompute} disabled={computing}>
            {computing ? "Computing…" : "Compute Now"}
          </button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div style={S.statsBar}>
            {[
              { val: filtered.length, lbl: "Learners" },
              { val: subjectList.length, lbl: "Subjects" },
              {
                val: scoredResults.length > 0
                  ? (scoredResults.reduce((a, r) => a + r.final_score, 0) / scoredResults.length).toFixed(1) + "%"
                  : "—",
                lbl: "Stream Average",
                color: "#2563eb",
              },
              {
                val: safeResults.filter(r => r.grade === "A").length,
                lbl: "Grade A", color: "#15803d",
              },
              {
                val: safeResults.filter(r => r.grade === "D" || r.grade === "N/A").length,
                lbl: "Need Support", color: "#dc2626",
              },
            ].map((s, i) => (
              <div key={i} style={S.statItem}>
                <div style={{ ...S.statVal, color: s.color || "#111827" }}>{s.val}</div>
                <div style={S.statLbl}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div style={S.viewToggle}>
            <button
              style={{ ...S.toggleBtn, ...(viewMode === "table" ? S.toggleActive : {}) }}
              onClick={() => { setViewMode("table"); setSelectedLearner(null); }}
            >
              Grid View
            </button>
            <button
              style={{ ...S.toggleBtn, ...(viewMode === "learner" ? S.toggleActive : {}) }}
              onClick={() => setViewMode("learner")}
            >
              Learner View
            </button>
          </div>

          {/* ── TABLE / GRID VIEW ── */}
          {viewMode === "table" && (
            <div style={{ ...S.card, overflowX: "auto" }}>
              <table style={{ ...S.table, minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={S.th}>Rank</th>
                    <th style={S.th}>Adm No</th>
                    <th style={S.th}>Learner</th>
                    {subjectList.map(sub => (
                      <th key={sub.id} style={{ ...S.th, textAlign: "center", maxWidth: 90 }}>
                        {sub.name.length > 10 ? sub.name.slice(0, 10) + "…" : sub.name}
                      </th>
                    ))}
                    <th style={{ ...S.th, textAlign: "center" }}>Average</th>
                    <th style={{ ...S.th, textAlign: "center" }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => {
                    const avgValue = averageScore(l.subjects);
                    const avg = avgValue == null ? null : avgValue.toFixed(1);
                    const topGrade = avgValue == null ? "N/A" : avgValue >= 80 ? "A" : avgValue >= 65 ? "B" : avgValue >= 50 ? "C" : "D";
                    const gs = gradeStyle(topGrade);

                    return (
                      <tr
                        key={l.learner_id}
                        style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb", cursor: "pointer" }}
                        onClick={() => { setSelectedLearner(l.learner_id); setViewMode("learner"); }}
                        title="Click to view learner detail"
                      >
                        <td style={{ ...S.td, fontWeight: 700, color: "#6b7280" }}>
                          {l.stream_rank || "—"}
                        </td>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 13 }}>{l.admission_number}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{l.learner_name}</td>
                        {subjectList.map(sub => {
                          const sr = l.subjects.find(s => s.subject_id === sub.id);
                          const g = gradeStyle(sr?.grade);
                          return (
                            <td key={sub.id} style={{ ...S.td, textAlign: "center" }}>
                              {sr?.final_score != null ? (
                                <span style={{ ...S.gradePill, background: g.bg, color: g.color }}>
                                  {sr.final_score}%
                                </span>
                              ) : <span style={{ color: "#d1d5db" }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>
                          {avg ? `${avg}%` : "—"}
                        </td>
                        <td style={{ ...S.td, textAlign: "center" }}>
                          <span style={{ ...S.gradeBadge, background: gs.bg, color: gs.color }}>
                            {topGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── LEARNER DETAIL VIEW ── */}
          {viewMode === "learner" && (
            <div style={S.learnerPanel}>
              {/* Learner list sidebar */}
              <div style={S.learnerList}>
                <div style={S.learnerListTitle}>Learners ({filtered.length})</div>
                {filtered.map(l => (
                  <div
                    key={l.learner_id}
                    style={{
                      ...S.learnerListItem,
                      background: selectedLearner === l.learner_id ? "#eff6ff" : "#fff",
                      borderLeft: selectedLearner === l.learner_id ? "3px solid #2563eb" : "3px solid transparent",
                    }}
                    onClick={() => setSelectedLearner(l.learner_id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{l.learner_name}</span>
                      <span style={{ ...S.rankBadge }}>{l.stream_rank || "—"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{l.admission_number}</div>
                  </div>
                ))}
              </div>

              {/* Learner detail */}
              <div style={S.learnerDetail}>
                {!learnerDetail ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
                    Select a learner from the list
                  </div>
                ) : (
                  <>
                    <div style={S.learnerDetailHeader}>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{learnerDetail.learner_name}</h2>
                        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                          {learnerDetail.admission_number} · {learnerDetail.gender}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={S.rankCard}>
                          <div style={S.rankNum}>{learnerDetail.stream_rank || "—"}</div>
                          <div style={S.rankLbl}>Stream Rank</div>
                        </div>
                        <div style={S.rankCard}>
                          <div style={S.rankNum}>{learnerDetail.class_rank || "—"}</div>
                          <div style={S.rankLbl}>Class Rank</div>
                        </div>
                      </div>
                    </div>

                    <table style={S.table}>
                      <thead>
                        <tr>
                          {["Subject", "Mid Term", "End of Term", "Final Score", "Grade", "Remarks"].map(h => (
                            <th key={h} style={S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {learnerDetail.subjects.map((sr, i) => {
                          const gs = gradeStyle(sr.grade);
                          return (
                            <tr key={sr.subject_id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ ...S.td, fontWeight: 600 }}>{sr.subject_name}</td>
                              <td style={{ ...S.td, textAlign: "center" }}>
                                {sr.mid_term_score != null ? `${sr.mid_term_score}%` : <span style={{ color: "#d1d5db" }}>—</span>}
                              </td>
                              <td style={{ ...S.td, textAlign: "center" }}>
                                {sr.end_term_score != null ? `${sr.end_term_score}%` : <span style={{ color: "#d1d5db" }}>—</span>}
                              </td>
                              <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>
                                {sr.final_score != null ? `${sr.final_score}%` : <span style={{ color: "#d1d5db" }}>—</span>}
                              </td>
                              <td style={{ ...S.td, textAlign: "center" }}>
                                <span style={{ ...S.gradeBadge, background: gs.bg, color: gs.color }}>
                                  {sr.grade || "—"}
                                </span>
                              </td>
                              <td style={{ ...S.td, color: "#6b7280", fontSize: 13 }}>{sr.remarks || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Learner PDF link */}
                    <div style={{ padding: "16px 0 0", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        style={{ ...S.btnPrimary, fontSize: 13 }}
                        onClick={() => downloadPdf(`/reports/learner/${learnerDetail.learner_id}/term/${selectedTerm}/pdf?mode=combined`, `${learnerDetail.admission_number}_report_card.pdf`)}
                      >
                        Download Report Card PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  page: { padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  breadcrumb: { fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  contextPill: { display: "inline-flex", alignItems: "center", background: "#eef2ff", color: "#3730a3", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, marginTop: 10 },

  alertError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  alertSuccess: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", fontFamily: "inherit" },

  emptyPrompt: { textAlign: "center", padding: "60px 20px", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" },
  loadingWrap: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  statsBar: { display: "flex", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 24px", marginBottom: 16, gap: 0 },
  statItem: { flex: 1, textAlign: "center" },
  statVal: { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  statLbl: { fontSize: 11, color: "#9ca3af", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  viewToggle: { display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", padding: 4, borderRadius: 8, width: "fit-content" },
  toggleBtn: { padding: "7px 18px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#64748b" },
  toggleActive: { background: "#fff", color: "#1e293b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "11px 14px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "11px 14px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },

  gradePill: { display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700 },
  gradeBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, fontWeight: 800, fontSize: 13 },

  learnerPanel: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" },
  learnerList: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  learnerListTitle: { padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #f3f4f6", background: "#f8fafc" },
  learnerListItem: { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" },
  rankBadge: { background: "#f1f5f9", color: "#64748b", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 },

  learnerDetail: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  learnerDetailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f3f4f6" },
  rankCard: { textAlign: "center", background: "#f8fafc", padding: "10px 20px", borderRadius: 10 },
  rankNum: { fontSize: 24, fontWeight: 800, color: "#2563eb" },
  rankLbl: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  btnPrimary: { padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnOutline: { padding: "9px 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
