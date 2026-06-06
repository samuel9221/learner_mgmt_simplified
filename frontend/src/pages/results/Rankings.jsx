import { useEffect, useState } from "react";
import api from "../../services/api";

const get = async (url) => {
  const response = await api.get(url);
  return response.data;
};

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

const GRADE_COLORS = {
  A: { bg: "#dcfce7", color: "#15803d" },
  B: { bg: "#dbeafe", color: "#1d4ed8" },
  C: { bg: "#fef9c3", color: "#a16207" },
  D: { bg: "#fee2e2", color: "#dc2626" },
};
const gc = (g) => GRADE_COLORS[g] || { bg: "#f3f4f6", color: "#9ca3af" };

export default function Rankings() {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [preferredTermId, setPreferredTermId] = useState("");
  const [rankMode, setRankMode] = useState("stream"); // stream | class
  const [searchQuery, setSearchQuery] = useState("");

  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

        setAcademicYears(years);
        setPreferredTermId(currentTerm?.id || "");
        setSelectedYear(currentTerm?.academic_year_id || currentYear?.id || years[0]?.id || "");
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
      setClasses([]);
      setSelectedTerm("");
      setSelectedStream("");
      setSelectedClass("");
      return;
    }

    let active = true;

    const loadYearFilters = async () => {
      setError("");
      try {
        const [termsRes, streamsRes, classesRes] = await Promise.all([
          get(`/terms?academic_year_id=${selectedYear}`),
          get(`/streams?academic_year_id=${selectedYear}`),
          get(`/classes?academic_year_id=${selectedYear}`),
        ]);
        if (!active) return;

        const yearTerms = termsRes.success && Array.isArray(termsRes.data) ? termsRes.data : [];
        const preferredTerm = yearTerms.find(t => String(t.id) === String(preferredTermId));
        const currentTerm = yearTerms.find(t => t.is_current);

        setTerms(yearTerms);
        setStreams(streamsRes.success && Array.isArray(streamsRes.data) ? streamsRes.data : []);
        setClasses(classesRes.success && Array.isArray(classesRes.data) ? classesRes.data : []);
        setSelectedStream("");
        setSelectedClass("");
        setSelectedTerm(previousTerm => (
          yearTerms.some(t => String(t.id) === String(previousTerm))
            ? previousTerm
            : (preferredTerm?.id || currentTerm?.id || "")
        ));
        setPreferredTermId("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message || "Failed to load terms, streams, and classes");
      }
    };

    loadYearFilters();
    return () => { active = false; };
  }, [selectedYear, preferredTermId]);

  // Load rankings when filters change
  useEffect(() => {
    const loadRankings = async () => {
      if (!selectedTerm) { setRankings([]); return; }
      if (rankMode === "stream" && !selectedStream) { setRankings([]); return; }
      if (rankMode === "class" && !selectedClass) { setRankings([]); return; }

      setLoading(true); setError("");
      try {
        const url = rankMode === "stream"
          ? `/analysis/stream/${selectedStream}/term/${selectedTerm}/rankings`
          : `/analysis/class/${selectedClass}/term/${selectedTerm}/rankings`;

        const d = await get(url);
        if (d.success) setRankings(Array.isArray(d.data) ? d.data : []);
        else setError(d.message || "Failed to load rankings");
      } catch (e) {
        setRankings([]);
        setError(e.response?.data?.message || e.message || "Failed to load rankings");
      } finally {
        setLoading(false);
      }
    };
    loadRankings();
  }, [selectedTerm, selectedStream, selectedClass, rankMode]);

  const filtered = rankings.filter(r =>
    r.learner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isReady = selectedTerm && (rankMode === "stream" ? selectedStream : selectedClass);
  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYear));
  const selectedTermObj = terms.find(t => String(t.id) === String(selectedTerm));
  const selectedStreamObj = streams.find(s => String(s.id) === String(selectedStream));
  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
  const contextLabel = [
    selectedYearObj?.year_name,
    selectedTermObj?.term_number ? `Term ${selectedTermObj.term_number}` : null,
    rankMode === "stream"
      ? [selectedStreamObj?.class_name, selectedStreamObj?.stream_name].filter(Boolean).join(" ")
      : selectedClassObj?.class_name,
  ].filter(Boolean).join(" / ");

  // ── Grade distribution from rankings ──────────────────────
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0 };
  filtered.forEach(r => {
    if (r.grade_a_count > 0) gradeCounts.A += r.grade_a_count;
    if (r.grade_b_count > 0) gradeCounts.B += r.grade_b_count;
    if (r.grade_c_count > 0) gradeCounts.C += r.grade_c_count;
    if (r.grade_d_count > 0) gradeCounts.D += r.grade_d_count;
  });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.topBar}>
        <div>
          <div style={S.breadcrumb}>Results</div>
          <h1 style={S.title}>Rankings</h1>
          <p style={S.subtitle}>
            Learner positions based on overall weighted average.
            View by stream or across the entire class.
          </p>
          {contextLabel && <div style={S.contextPill}>{contextLabel}</div>}
        </div>

        {/* Mode toggle */}
        <div style={S.modeToggle}>
          <button
            style={{ ...S.modeBtn, ...(rankMode === "stream" ? S.modeBtnActive : {}) }}
            onClick={() => { setRankMode("stream"); setRankings([]); }}
          >
            Stream Rankings
          </button>
          <button
            style={{ ...S.modeBtn, ...(rankMode === "class" ? S.modeBtnActive : {}) }}
            onClick={() => { setRankMode("class"); setRankings([]); }}
          >
            Class Rankings
          </button>
        </div>
      </div>

      {error && <div style={S.alertError}>⚠ {error}</div>}

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
          {rankMode === "stream" ? (
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
          ) : (
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Class</label>
              <select style={S.select} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
          )}
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Search</label>
            <input
              style={S.select}
              placeholder="Name or adm no…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!isReady ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥇</div>
          <p style={{ color: "#6b7280" }}>
            Select a term and {rankMode === "stream" ? "stream" : "class"} to view rankings.
          </p>
        </div>
      ) : loading ? (
        <div style={S.loadingWrap}><div style={S.spinner} /></div>
      ) : rankings.length === 0 ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#6b7280" }}>No rankings available. Compute final results first.</p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {filtered.slice(0, 3).length > 0 && (
            <div style={S.podiumWrap}>
              {/* Reorder: 2nd, 1st, 3rd */}
              {[1, 0, 2].map(i => {
                const r = filtered[i];
                if (!r) return <div key={i} style={{ flex: 1 }} />;
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const heights = { 1: 110, 2: 80, 3: 60 };
                const colors = {
                  1: { bg: "#fef9c3", border: "#fbbf24", text: "#92400e" },
                  2: { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" },
                  3: { bg: "#fff7ed", border: "#fb923c", text: "#9a3412" },
                };
                const c = colors[rank];
                return (
                  <div key={i} style={{ ...S.podiumItem, flex: 1 }}>
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 32 }}>{MEDAL[rank]}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{r.learner_name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{r.admission_number}</div>
                      {r.stream_name && <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.stream_name}</div>}
                      <div style={{ fontWeight: 800, fontSize: 20, color: "#2563eb", marginTop: 4 }}>
                        {r.overall_average ? `${r.overall_average}%` : "—"}
                      </div>
                    </div>
                    <div style={{
                      height: heights[rank],
                      background: c.bg,
                      border: `2px solid ${c.border}`,
                      borderBottom: "none",
                      borderRadius: "8px 8px 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: c.text }}>#{rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grade summary */}
          <div style={S.gradeBar}>
            {Object.entries(gradeCounts).map(([grade, count]) => {
              const g = gc(grade);
              return (
                <div key={grade} style={{ ...S.gradeBarItem, background: g.bg }}>
                  <span style={{ ...S.gradeBadge, background: g.color }}>{grade}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: g.color }}>{count}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>subjects</span>
                </div>
              );
            })}
            <div style={{ ...S.gradeBarItem, background: "#f8fafc" }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{filtered.length}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>learners</span>
            </div>
          </div>

          {/* Full rankings table */}
          <div style={S.card}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Position</th>
                  <th style={S.th}>Adm No</th>
                  <th style={S.th}>Learner</th>
                  {rankMode === "class" && <th style={S.th}>Stream</th>}
                  <th style={{ ...S.th, textAlign: "center" }}>Overall Avg</th>
                  <th style={{ ...S.th, textAlign: "center" }}>Subjects</th>
                  <th style={{ ...S.th, textAlign: "center" }}>A's</th>
                  <th style={{ ...S.th, textAlign: "center" }}>B's</th>
                  <th style={{ ...S.th, textAlign: "center" }}>C's</th>
                  <th style={{ ...S.th, textAlign: "center" }}>D's</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const pos = rankMode === "stream" ? r.stream_rank : r.class_rank;
                  const isTop3 = pos <= 3;
                  return (
                    <tr key={r.admission_number} style={{
                      background: isTop3
                        ? pos === 1 ? "#fffbeb" : pos === 2 ? "#f8fafc" : "#fff7ed"
                        : idx % 2 === 0 ? "#fff" : "#f9fafb",
                    }}>
                      <td style={{ ...S.td, fontWeight: 700 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isTop3
                            ? <span style={{ fontSize: 20 }}>{MEDAL[pos]}</span>
                            : <span style={S.posBadge}>{pos || "—"}</span>
                          }
                        </div>
                      </td>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: 13 }}>{r.admission_number}</td>
                      <td style={{ ...S.td, fontWeight: isTop3 ? 700 : 500 }}>
                        {r.learner_name}
                        {r.gender && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: r.gender === "Male" ? "#dbeafe" : "#fce7f3",
                            color: r.gender === "Male" ? "#1d4ed8" : "#be185d",
                            fontWeight: 600,
                          }}>
                            {r.gender === "Male" ? "M" : "F"}
                          </span>
                        )}
                      </td>
                      {rankMode === "class" && (
                        <td style={{ ...S.td, color: "#6b7280", fontSize: 13 }}>{r.stream_name}</td>
                      )}
                      <td style={{ ...S.td, textAlign: "center", fontWeight: 700, color: "#2563eb" }}>
                        {r.overall_average ? `${r.overall_average}%` : "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "center", color: "#6b7280" }}>{r.subjects_taken || "—"}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={{ ...S.gradeCount, background: "#dcfce7", color: "#15803d" }}>{r.grade_a_count || 0}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={{ ...S.gradeCount, background: "#dbeafe", color: "#1d4ed8" }}>{r.grade_b_count || 0}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={{ ...S.gradeCount, background: "#fef9c3", color: "#a16207" }}>{r.grade_c_count || 0}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={{ ...S.gradeCount, background: "#fee2e2", color: "#dc2626" }}>{r.grade_d_count || 0}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  page: { padding: "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  breadcrumb: { fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  contextPill: { display: "inline-flex", alignItems: "center", background: "#eef2ff", color: "#3730a3", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, marginTop: 10 },

  alertError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },

  modeToggle: { display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, gap: 4 },
  modeBtn: { padding: "8px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#64748b" },
  modeBtnActive: { background: "#fff", color: "#1e293b", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", fontFamily: "inherit" },

  emptyPrompt: { textAlign: "center", padding: "60px 20px", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" },
  loadingWrap: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  podiumWrap: { display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px 24px 0" },
  podiumItem: { display: "flex", flexDirection: "column", justifyContent: "flex-end" },

  gradeBar: { display: "flex", gap: 12, marginBottom: 20 },
  gradeBarItem: { flex: 1, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "1px solid #e5e7eb" },
  gradeBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, fontWeight: 800, fontSize: 13, color: "#fff" },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "11px 14px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "11px 14px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  posBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: 13 },
  gradeCount: { display: "inline-block", padding: "2px 10px", borderRadius: 12, fontWeight: 700, fontSize: 13 },
};
