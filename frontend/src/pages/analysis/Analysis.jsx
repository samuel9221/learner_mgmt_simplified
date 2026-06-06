import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import api from "../../services/api";

const get = async (url) => {
  const response = await api.get(url);
  return response.data;
};

const GRADE_META = {
  A: { color: "#15803d", bg: "#dcfce7", label: "Excellent" },
  B: { color: "#1d4ed8", bg: "#dbeafe", label: "Good" },
  C: { color: "#a16207", bg: "#fef9c3", label: "Satisfactory" },
  D: { color: "#dc2626", bg: "#fee2e2", label: "Below Avg" },
};

const scoreGrade = (score) => {
  const n = Number(score);
  if (Number.isNaN(n)) return "N/A";
  if (n >= 80) return "A";
  if (n >= 65) return "B";
  if (n >= 50) return "C";
  return "D";
};

const slug = (value) => String(value || "analysis").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Simple pure-CSS bar chart — no external chart lib needed
const BarChart = ({ data, valueKey, labelKey, color = "#2563eb", maxVal }) => {
  const max = maxVal || Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 120, fontSize: 12, color: "#6b7280", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d[labelKey]}
          </div>
          <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 24, position: "relative", overflow: "hidden" }}>
            <div style={{
              width: `${((d[valueKey] || 0) / max) * 100}%`,
              background: color,
              height: "100%",
              borderRadius: 4,
              transition: "width 0.6s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
            }}>
              {((d[valueKey] || 0) / max) > 0.15 && (
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{d[valueKey]}%</span>
              )}
            </div>
          </div>
          {((d[valueKey] || 0) / max) <= 0.15 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", minWidth: 36 }}>{d[valueKey]}%</span>
          )}
        </div>
      ))}
    </div>
  );
};

// Donut-style grade distribution (pure CSS)
const GradeDonut = ({ distribution }) => {
  const total = distribution.reduce((a, b) => a + Number(b.count), 0);
  if (!total) return <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>No data</div>;

  let cumulative = 0;
  const segments = distribution.map(d => {
    const pct = (Number(d.count) / total) * 100;
    const start = cumulative;
    cumulative += pct;
    const meta = GRADE_META[d.grade] || { color: "#9ca3af", bg: "#f3f4f6", label: "N/A" };
    return { ...d, pct, start, color: meta.color, bg: meta.bg, label: meta.label };
  });

  // SVG donut
  const r = 60, cx = 80, cy = 80, stroke = 24;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-((seg.start / 100) * circumference)}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="#111827">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#9ca3af">results</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color }} />
            <span style={{ fontSize: 13, color: "#374151" }}>
              <strong>{seg.grade}</strong> — {seg.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: seg.color, marginLeft: "auto" }}>
              {seg.count} ({seg.pct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Analysis() {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [streams, setStreams] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [preferredTermId, setPreferredTermId] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview"); // overview | subjects | learners | grades

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
        const preferredTerm = yearTerms.find(t => String(t.id) === String(preferredTermId));
        const currentTerm = yearTerms.find(t => t.is_current);

        setTerms(yearTerms);
        setStreams(streamsRes.success && Array.isArray(streamsRes.data) ? streamsRes.data : []);
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

  // Load term overview whenever term changes
  useEffect(() => {
    if (!selectedTerm) { setOverview(null); return; }
    let active = true;

    const loadOverview = async () => {
      setError("");
      try {
        const d = await get(`/analysis/term/${selectedTerm}/overview`);
        if (!active) return;
        if (d.success) setOverview(d.data);
        else setError(d.message || "Failed to load term overview");
      } catch (e) {
        if (active) {
          setOverview(null);
          setError(e.response?.data?.message || e.message || "Failed to load term overview");
        }
      }
    };

    loadOverview();
    return () => { active = false; };
  }, [selectedTerm]);

  // Load stream analysis when both term + stream selected
  useEffect(() => {
    if (!selectedTerm || !selectedStream) { setAnalysis(null); return; }
    let active = true;

    setLoading(true); setError("");
    get(`/analysis/stream/${selectedStream}/term/${selectedTerm}`)
      .then(d => {
        if (!active) return;
        if (d.success) setAnalysis(d.data);
        else setError(d.message || "Failed to load analysis");
      })
      .catch(e => {
        if (active) {
          setAnalysis(null);
          setError(e.response?.data?.message || e.message || "Failed to load analysis");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedTerm, selectedStream]);

  const isStreamSelected = selectedTerm && selectedStream;

  // ── Grade distribution for donut ─────────────────────────
  const gradeDistData = analysis?.grade_distribution
    ? Object.entries(
        analysis.grade_distribution.reduce((acc, r) => {
          if (!acc[r.grade]) acc[r.grade] = 0;
          acc[r.grade] += Number(r.count);
          return acc;
        }, {})
      ).map(([grade, count]) => ({ grade, count }))
    : [];

  // ── Subject avg data for bar chart ────────────────────────
  const subjectBarData = (analysis?.subject_stats || []).map(s => ({
    subject_name: s.subject_name?.length > 14 ? s.subject_name.slice(0, 14) + "…" : s.subject_name,
    avg_final: Number(s.avg_final) || 0,
  }));

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "subjects", label: "Subject Performance" },
    { key: "learners", label: "Learner Summary" },
    { key: "grades", label: "Grade Distribution" },
  ];
  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYear));
  const selectedTermObj = terms.find(t => String(t.id) === String(selectedTerm));
  const selectedStreamObj = streams.find(s => String(s.id) === String(selectedStream));
  const contextLabel = [
    selectedYearObj?.year_name,
    selectedTermObj?.term_number ? `Term ${selectedTermObj.term_number}` : null,
    selectedStreamObj ? [selectedStreamObj.class_name, selectedStreamObj.stream_name].filter(Boolean).join(" ") : "All streams",
  ].filter(Boolean).join(" / ");

  const exportAnalysisExcel = () => {
    if (!selectedTerm || (!overview && !analysis)) return;

    const workbook = XLSX.utils.book_new();

    if (overview) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
        "Total Learners": overview.total_learners,
        "Total Subjects": overview.total_subjects,
        "Total Streams": overview.total_streams,
        "School Average": overview.school_average,
        "Grade A": overview.grade_a,
        "Grade B": overview.grade_b,
        "Grade C": overview.grade_c,
        "Grade D": overview.grade_d,
        "Not Graded": overview.not_graded,
      }]), "Overview");
    }

    if (analysis) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((analysis.subject_stats || []).map(s => ({
        Subject: s.subject_name,
        Code: s.subject_code,
        Learners: s.total_learners,
        "Mid Term Avg": s.avg_mid_term,
        "End of Term Avg": s.avg_end_term,
        "Final Avg": s.avg_final,
        Highest: s.max_score,
        Lowest: s.min_score,
        Grade: scoreGrade(s.avg_final),
      }))), "Subject Analysis");

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((analysis.learner_overall || []).map(l => ({
        Position: l.stream_rank,
        "Admission No": l.admission_number,
        Learner: l.learner_name,
        Gender: l.gender,
        Total: l.overall_average && l.subjects_taken ? Number((Number(l.overall_average) * Number(l.subjects_taken)).toFixed(2)) : "",
        Average: l.overall_average,
        Grade: scoreGrade(l.overall_average),
        "Subjects Taken": l.subjects_taken,
      }))), "Learner Rankings");

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((analysis.grade_distribution || []).map(g => ({
        Subject: g.subject_name,
        Grade: g.grade,
        Count: g.count,
      }))), "Grade Distribution");

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
        Passed: analysis.pass_fail?.passed || 0,
        "Need Support": analysis.pass_fail?.failed || 0,
        "Not Graded": analysis.pass_fail?.not_graded || 0,
        "Total Learners": analysis.pass_fail?.total_learners || 0,
      }]), "Pass Fail");
    }

    XLSX.writeFile(workbook, `${slug(contextLabel)}_analysis.xlsx`);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.topBar}>
        <div>
          <div style={S.breadcrumb}>Analysis</div>
          <h1 style={S.title}>Performance Analysis</h1>
          <p style={S.subtitle}>
            Detailed breakdown of exam performance by subject, learner and grade distribution.
          </p>
          {selectedTerm && <div style={S.contextPill}>{contextLabel}</div>}
        </div>
        <button
          style={{ ...S.btnOutline, opacity: selectedTerm && (overview || analysis) ? 1 : 0.6 }}
          onClick={exportAnalysisExcel}
          disabled={!selectedTerm || (!overview && !analysis)}
        >
          Export Excel
        </button>
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
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Stream (optional)</label>
            <select style={S.select} value={selectedStream} onChange={e => setSelectedStream(e.target.value)} disabled={!selectedTerm}>
              <option value="">All streams (overview only)</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>
                  {[s.class_name, s.stream_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedTerm ? (
        <div style={S.emptyPrompt}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
          <p style={{ color: "#6b7280" }}>Select an academic year and term to view analysis.</p>
        </div>
      ) : (
        <>
          {/* ── School-wide overview (always shown when term selected) ── */}
          {overview && (
            <div style={S.overviewGrid}>
              {[
                { val: overview.total_learners, lbl: "Total Learners", icon: "👥", color: "#2563eb" },
                { val: overview.total_subjects, lbl: "Subjects", icon: "📚", color: "#7c3aed" },
                { val: overview.total_streams, lbl: "Streams", icon: "🏫", color: "#0891b2" },
                { val: overview.school_average ? `${overview.school_average}%` : "—", lbl: "School Average", icon: "📊", color: "#059669" },
                { val: overview.grade_a, lbl: "Grade A", icon: "🏆", color: "#15803d" },
                { val: overview.grade_d, lbl: "Grade D", icon: "⚠", color: "#dc2626" },
              ].map((item, i) => (
                <div key={i} style={S.overviewCard}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ ...S.overviewVal, color: item.color }}>{item.val}</div>
                  <div style={S.overviewLbl}>{item.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Stream-level analysis ── */}
          {!isStreamSelected ? (
            <div style={S.streamPrompt}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <p style={{ color: "#6b7280", fontSize: 14 }}>Select a stream above for detailed per-subject and per-learner analysis.</p>
            </div>
          ) : loading ? (
            <div style={S.loadingWrap}><div style={S.spinner} /></div>
          ) : !analysis ? (
            <div style={S.streamPrompt}>
              <p style={{ color: "#9ca3af" }}>No analysis data available for this stream and term.</p>
            </div>
          ) : (
            <>
              {/* Pass/fail highlight */}
              <div style={S.passFailBar}>
                <div style={{ ...S.passFail, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#15803d" }}>
                    {analysis.pass_fail?.passed || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "#15803d" }}>Passed</div>
                </div>
                <div style={{ ...S.passFail, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#dc2626" }}>
                    {analysis.pass_fail?.failed || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "#dc2626" }}>Need Support</div>
                </div>
                <div style={{ ...S.passFail, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#64748b" }}>
                    {analysis.pass_fail?.total_learners || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Total Learners</div>
                </div>
                <div style={{ ...S.passFail, background: "#eff6ff", border: "1px solid #bfdbfe", flex: 2 }}>
                  <div style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>Pass Rate</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8" }}>
                        {analysis.pass_fail?.total_learners
                          ? `${((analysis.pass_fail.passed / analysis.pass_fail.total_learners) * 100).toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>
                    <div style={{ background: "#dbeafe", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{
                        width: analysis.pass_fail?.total_learners
                          ? `${(analysis.pass_fail.passed / analysis.pass_fail.total_learners) * 100}%`
                          : "0%",
                        background: "#2563eb",
                        height: "100%",
                        borderRadius: 4,
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={S.tabBar}>
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    style={{ ...S.tab, ...(activeTab === tab.key ? S.tabActive : {}) }}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Overview ── */}
              {activeTab === "overview" && (
                <div style={S.twoCol}>
                  <div style={S.card}>
                    <div style={S.cardTitle}>Subject Averages</div>
                    <div style={{ padding: "16px 20px" }}>
                      <BarChart
                        data={subjectBarData}
                        valueKey="avg_final"
                        labelKey="subject_name"
                        color="#2563eb"
                        maxVal={100}
                      />
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={S.cardTitle}>Grade Distribution</div>
                    <div style={{ padding: "20px" }}>
                      <GradeDonut distribution={gradeDistData} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Subject Performance ── */}
              {activeTab === "subjects" && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Subject Performance Breakdown</div>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {["Subject", "Learners", "Mid Term Avg", "End of Term Avg", "Final Avg", "Highest", "Lowest"].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(analysis.subject_stats || []).map((s, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{s.subject_name}</td>
                          <td style={{ ...S.td, textAlign: "center" }}>{s.total_learners}</td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <span style={S.scorePill}>{s.avg_mid_term || "—"}%</span>
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <span style={S.scorePill}>{s.avg_end_term || "—"}%</span>
                          </td>
                          <td style={{ ...S.td, textAlign: "center", fontWeight: 700, color: "#2563eb" }}>
                            {s.avg_final || "—"}%
                          </td>
                          <td style={{ ...S.td, textAlign: "center", color: "#15803d", fontWeight: 600 }}>
                            {s.max_score || "—"}%
                          </td>
                          <td style={{ ...S.td, textAlign: "center", color: "#dc2626", fontWeight: 600 }}>
                            {s.min_score || "—"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tab: Learner Summary ── */}
              {activeTab === "learners" && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Learner Overall Performance</div>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {["Stream Rank", "Learner", "Gender", "Overall Average", "Subjects Taken"].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(analysis.learner_overall || []).map((l, i) => {
                        const avg = Number(l.overall_average);
                        const grade = avg >= 80 ? "A" : avg >= 65 ? "B" : avg >= 50 ? "C" : "D";
                        const gm = GRADE_META[grade];
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                            <td style={{ ...S.td, fontWeight: 700, color: "#6b7280" }}>
                              {l.stream_rank || "—"}
                            </td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{l.learner_name}</td>
                            <td style={{ ...S.td }}>
                              <span style={{
                                fontSize: 12, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                                background: l.gender === "Male" ? "#dbeafe" : "#fce7f3",
                                color: l.gender === "Male" ? "#1d4ed8" : "#be185d",
                              }}>
                                {l.gender === "Male" ? "M" : "F"}
                              </span>
                            </td>
                            <td style={{ ...S.td }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
                                  <div style={{ width: `${avg}%`, background: gm.color, height: "100%", borderRadius: 4 }} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: gm.color, minWidth: 44 }}>
                                  {l.overall_average}%
                                </span>
                                <span style={{ ...S.gradeChip, background: gm.bg, color: gm.color }}>{grade}</span>
                              </div>
                            </td>
                            <td style={{ ...S.td, textAlign: "center", color: "#6b7280" }}>{l.subjects_taken}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tab: Grade Distribution ── */}
              {activeTab === "grades" && (
                <div style={S.twoCol}>
                  <div style={S.card}>
                    <div style={S.cardTitle}>Grades by Subject</div>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Subject</th>
                          {["A", "B", "C", "D"].map(g => (
                            <th key={g} style={{ ...S.th, textAlign: "center" }}>
                              <span style={{ ...S.gradeChip, background: GRADE_META[g].bg, color: GRADE_META[g].color }}>{g}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analysis.subject_stats || []).map((sub, i) => {
                          // Get grade counts for this subject from grade_distribution
                          const subGrades = {};
                          (analysis.grade_distribution || [])
                            .filter(r => r.subject_name === sub.subject_name)
                            .forEach(r => { subGrades[r.grade] = r.count; });
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ ...S.td, fontWeight: 600 }}>{sub.subject_name}</td>
                              {["A", "B", "C", "D"].map(g => (
                                <td key={g} style={{ ...S.td, textAlign: "center" }}>
                                  {subGrades[g]
                                    ? <span style={{ ...S.gradeChip, background: GRADE_META[g].bg, color: GRADE_META[g].color }}>{subGrades[g]}</span>
                                    : <span style={{ color: "#d1d5db" }}>0</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={S.card}>
                    <div style={S.cardTitle}>Overall Grade Distribution</div>
                    <div style={{ padding: "20px" }}>
                      <GradeDonut distribution={gradeDistData} />
                    </div>
                    {/* Grade totals */}
                    <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {gradeDistData.map(d => {
                        const gm = GRADE_META[d.grade] || { bg: "#f3f4f6", color: "#9ca3af", label: "N/A" };
                        return (
                          <div key={d.grade} style={{ background: gm.bg, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: gm.color }}>{d.count}</div>
                            <div style={{ fontSize: 12, color: gm.color, fontWeight: 600 }}>Grade {d.grade} — {gm.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", fontFamily: "inherit" },

  emptyPrompt: { textAlign: "center", padding: "60px 20px", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" },
  streamPrompt: { textAlign: "center", padding: "32px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 },
  loadingWrap: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 },
  overviewCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px", textAlign: "center" },
  overviewVal: { fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  overviewLbl: { fontSize: 11, color: "#9ca3af", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  passFailBar: { display: "flex", gap: 12, marginBottom: 20 },
  passFail: { flex: 1, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },

  tabBar: { display: "flex", gap: 2, marginBottom: 16, borderBottom: "2px solid #f1f5f9" },
  tab: { padding: "10px 20px", border: "none", background: "transparent", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#6b7280", borderBottom: "2px solid transparent", marginBottom: -2 },
  tabActive: { color: "#2563eb", fontWeight: 700, borderBottom: "2px solid #2563eb" },

  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#374151", padding: "14px 20px", borderBottom: "1px solid #f3f4f6" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "11px 14px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "11px 14px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },

  scorePill: { background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 },
  gradeChip: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700 },
  btnOutline: { padding: "9px 18px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
