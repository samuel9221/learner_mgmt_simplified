import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import api from "../../services/api";

const get = async (url) => {
  const response = await api.get(url);
  return response.data;
};

const scoreGrade = (score) => {
  const n = Number(score);
  if (Number.isNaN(n)) return "N/A";
  if (n >= 80) return "A";
  if (n >= 65) return "B";
  if (n >= 50) return "C";
  return "D";
};

const slug = (value) => String(value || "marks").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function ExamEntry() {
  // ── Filters ───────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // ── Table data ────────────────────────────────────────────
  const [learners, setLearners] = useState([]); // [{id, name, admission_number, score, is_absent, saved}]
  const [existingResults, setExistingResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);

  // ── Load academic years on mount ──────────────────────────
  useEffect(() => {
    get("/academic-years").then(d => {
      if (d.success) setAcademicYears(d.data);
    });
  }, []);

  // ── Load terms when year changes ──────────────────────────
  useEffect(() => {
    if (!selectedYear) return;
    setSelectedTerm(""); setSelectedSession(""); setSelectedStream("");
    setSelectedSubject(""); setLearners([]);
    get(`/terms?academic_year_id=${selectedYear}`).then(d => {
      if (d.success) setTerms(d.data);
    });
  }, [selectedYear]);

  // ── Load exam sessions when term changes ──────────────────
  useEffect(() => {
    if (!selectedTerm) return;
    setSelectedSession(""); setSelectedStream(""); setSelectedSubject(""); setLearners([]);
    get(`/exam-sessions/term/${selectedTerm}`).then(d => {
      if (d.success) setSessions(d.data);
    });
  }, [selectedTerm]);

  // ── Load streams when session changes ─────────────────────
  useEffect(() => {
    if (!selectedSession) return;
    setSelectedStream(""); setSelectedSubject(""); setLearners([]);
    get(`/streams?academic_year_id=${selectedYear}`).then(d => {
      if (d.success) setStreams(d.data);
    });
  }, [selectedSession]);

  // ── Load subjects when stream changes ─────────────────────
  useEffect(() => {
    if (!selectedStream) return;
    setSelectedSubject(""); setLearners([]);
    get(`/subjects?stream_id=${selectedStream}&academic_year_id=${selectedYear}`).then(d => {
      if (d.success) setSubjects(d.data);
    });
  }, [selectedStream]);

  // ── Load learners + existing results when subject chosen ──
  const loadLearnerScores = useCallback(async () => {
    if (!selectedStream || !selectedSession || !selectedSubject) return;
    setLoading(true);
    setError("");
    try {
      const selectedSubjectInfo = subjects.find(s => String(s.id) === String(selectedSubject));
      const isOptional = selectedSubjectInfo && !selectedSubjectInfo.is_compulsory;
      const learnerParams = `stream_id=${selectedStream}&academic_year_id=${selectedYear}&limit=500`;
      const learnerUrl = isOptional
        ? `/learners?${learnerParams}&subject_id=${selectedSubject}`
        : `/learners?${learnerParams}`;

      const [learnersRes, resultsRes] = await Promise.all([
        get(learnerUrl),
        get(`/exam-results/session/${selectedSession}/stream/${selectedStream}`),
      ]);

      if (!learnersRes.success) throw new Error(learnersRes.message);

      // Map existing results keyed by learner_id + subject_id
      const existing = {};
      if (resultsRes.success) {
        resultsRes.data
          .filter(r => r.subject_id === selectedSubject)
          .forEach(r => { existing[r.learner_id] = r; });
      }
      setExistingResults(existing);

      // Build table rows
      const rows = learnersRes.data.map(l => ({
        id: l.id,
        admission_number: l.admission_number,
        name: `${l.first_name} ${l.last_name}`,
        gender: l.gender,
        score: existing[l.id]?.score ?? "",
        is_absent: existing[l.id]?.is_absent ?? false,
        saved: !!existing[l.id],
      }));
      setLearners(rows);
      setDirty(false);
    } catch (e) {
      setError(e.message || "Failed to load learners");
    } finally {
      setLoading(false);
    }
  }, [selectedStream, selectedSession, selectedSubject, selectedYear, subjects]);

  useEffect(() => { loadLearnerScores(); }, [loadLearnerScores]);

  // ── Score change ──────────────────────────────────────────
  const handleScoreChange = (idx, value) => {
    const updated = [...learners];
    const numeric = value === "" ? "" : Math.min(100, Math.max(0, Number(value)));
    updated[idx] = { ...updated[idx], score: numeric, saved: false };
    setLearners(updated);
    setDirty(true);
  };

  const handleAbsentToggle = (idx) => {
    const updated = [...learners];
    updated[idx] = {
      ...updated[idx],
      is_absent: !updated[idx].is_absent,
      score: !updated[idx].is_absent ? "" : updated[idx].score,
      saved: false,
    };
    setLearners(updated);
    setDirty(true);
  };

  // ── Fill all empty with a value (quick fill) ──────────────
  const fillAll = (value) => {
    const updated = learners.map(l =>
      l.is_absent ? l : { ...l, score: value, saved: false }
    );
    setLearners(updated);
    setDirty(true);
  };

  // ── Save all (bulk) ───────────────────────────────────────
  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validate: non-absent learners must have a score
    const invalid = learners.filter(l => !l.is_absent && l.score === "");
    if (invalid.length > 0) {
      setError(`${invalid.length} learner(s) have no score entered. Enter a score or mark as absent.`);
      return;
    }

    setSaving(true);
    try {
      const results = learners.map(l => ({
        learner_id: l.id,
        subject_id: selectedSubject,
        score: l.is_absent ? null : Number(l.score),
        is_absent: l.is_absent,
      }));

      const { data } = await api.post("/exam-results/bulk", {
          exam_session_id: selectedSession,
          stream_id: selectedStream,
          results,
      });
      if (data.success) {
        setSuccess(`${data.message} — final scores auto-computed`);
        setLearners(prev => prev.map(l => ({ ...l, saved: true })));
        setDirty(false);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.message || "Save failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Save failed - check your connection");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────
  const enteredScores = learners.filter(l => !l.is_absent && l.score !== "").map(l => Number(l.score));
  const avg = enteredScores.length
    ? (enteredScores.reduce((a, b) => a + b, 0) / enteredScores.length).toFixed(1)
    : "—";
  const highest = enteredScores.length ? Math.max(...enteredScores) : "—";
  const lowest = enteredScores.length ? Math.min(...enteredScores) : "—";
  const absentCount = learners.filter(l => l.is_absent).length;
  const enteredCount = learners.filter(l => !l.is_absent && l.score !== "").length;

  const sessionInfo = sessions.find(s => s.id === selectedSession);
  const subjectInfo = subjects.find(s => String(s.id) === String(selectedSubject));
  const isOptionalSubject = subjectInfo && !subjectInfo.is_compulsory;
  const isReady = selectedSession && selectedStream && selectedSubject;
  const selectedYearInfo = academicYears.find(y => String(y.id) === String(selectedYear));
  const selectedTermInfo = terms.find(t => String(t.id) === String(selectedTerm));
  const selectedStreamInfo = streams.find(s => String(s.id) === String(selectedStream));

  const exportMarksExcel = () => {
    if (!learners.length) return;

    const ranked = learners
      .map(l => ({ ...l, numericScore: l.is_absent || l.score === "" ? null : Number(l.score) }))
      .sort((a, b) => (b.numericScore ?? -1) - (a.numericScore ?? -1));

    const positions = {};
    let lastScore = null;
    let lastPosition = 0;
    ranked.forEach((l, index) => {
      if (l.numericScore === null) return;
      if (l.numericScore !== lastScore) lastPosition = index + 1;
      positions[l.id] = lastPosition;
      lastScore = l.numericScore;
    });

    const weight = sessionInfo?.exam_type === "mid_term" ? 0.4 : 0.6;
    const rows = learners.map((l, index) => {
      const score = l.is_absent || l.score === "" ? null : Number(l.score);
      return {
        "#": index + 1,
        "Admission No": l.admission_number,
        "Learner Name": l.name,
        Gender: l.gender,
        Score: score ?? "Absent",
        Weighted: score === null ? "" : Number((score * weight).toFixed(1)),
        Total: score ?? "",
        Grade: score === null ? "ABS" : scoreGrade(score),
        Position: positions[l.id] || "",
        Status: l.is_absent ? "Absent" : l.saved ? "Saved" : "Pending",
      };
    });

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 5 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Marks");
    XLSX.writeFile(
      workbook,
      `${slug([selectedYearInfo?.year_name, selectedTermInfo?.term_number && `term_${selectedTermInfo.term_number}`, selectedStreamInfo?.stream_name, subjectInfo?.subject_name].filter(Boolean).join("_"))}_marks.xlsx`
    );
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.breadcrumb}>Exams</div>
          <h1 style={styles.title}>Score Entry</h1>
          <p style={styles.subtitle}>
            Enter marks out of 100%. The system automatically applies
            40% weight for Mid Term and 60% for End of Term.
          </p>
        </div>
        {dirty && isReady && (
          <div style={styles.unsavedBadge}>● Unsaved changes</div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Academic Year</label>
            <select
              style={styles.select}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="">Select year</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.year_name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Term</label>
            <select
              style={styles.select}
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              disabled={!selectedYear}
            >
              <option value="">Select term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>Term {t.term_number}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Exam</label>
            <select
              style={styles.select}
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              disabled={!selectedTerm}
            >
              <option value="">Select exam</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.exam_type === "mid_term" ? "Mid Term" : "End of Term"}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Stream / Class</label>
            <select
              style={styles.select}
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              disabled={!selectedSession}
            >
              <option value="">Select stream</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>{s.stream_name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Subject</label>
            <select
              style={styles.select}
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={!selectedStream}
            >
              <option value="">Select subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_name}{s.is_compulsory ? " (Compulsory)" : " (Optional)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Session info pill ── */}
      {sessionInfo && (
        <div style={styles.sessionPill}>
          <span style={{
            ...styles.examTypeBadge,
            background: sessionInfo.exam_type === "mid_term" ? "#dbeafe" : "#dcfce7",
            color: sessionInfo.exam_type === "mid_term" ? "#1d4ed8" : "#15803d",
          }}>
            {sessionInfo.exam_type === "mid_term" ? "Mid Term — 40% weight" : "End of Term — 60% weight"}
          </span>
          {sessionInfo.start_date && (
            <span style={styles.sessionDate}>
              {new Date(sessionInfo.start_date).toLocaleDateString()} –{" "}
              {new Date(sessionInfo.end_date).toLocaleDateString()}
            </span>
          )}
          {subjectInfo && (
            <span style={{
              ...styles.examTypeBadge,
              background: isOptionalSubject ? "#fef9c3" : "#eef2ff",
              color: isOptionalSubject ? "#a16207" : "#3730a3",
            }}>
              {isOptionalSubject ? "Optional subject - assigned learners only" : "Compulsory subject - full stream"}
            </span>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      {error && <div style={styles.alertError}>⚠ {error}</div>}
      {success && <div style={styles.alertSuccess}>✓ {success}</div>}

      {/* ── Main content ── */}
      {!isReady ? (
        <div style={styles.emptyPrompt}>
          <div style={styles.emptyIcon}>📝</div>
          <p style={{ color: "#6b7280", marginTop: 12 }}>
            Select an exam session, stream and subject above to begin entering scores.
          </p>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={{ color: "#6b7280", marginTop: 12 }}>Loading learners…</span>
        </div>
      ) : learners.length === 0 ? (
        <div style={styles.emptyPrompt}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={{ color: "#6b7280" }}>
            {isOptionalSubject
              ? "No learners in this stream are assigned to this optional subject."
              : "No learners found in this stream."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Stats bar ── */}
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <div style={styles.statVal}>{learners.length}</div>
              <div style={styles.statLbl}>Total Learners</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={styles.statVal}>{enteredCount}</div>
              <div style={styles.statLbl}>Scores Entered</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statVal, color: "#ef4444" }}>{absentCount}</div>
              <div style={styles.statLbl}>Absent</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statVal, color: "#2563eb" }}>{avg}%</div>
              <div style={styles.statLbl}>Current Average</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statVal, color: "#16a34a" }}>{highest}{highest !== "—" ? "%" : ""}</div>
              <div style={styles.statLbl}>Highest</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statVal, color: "#dc2626" }}>{lowest}{lowest !== "—" ? "%" : ""}</div>
              <div style={styles.statLbl}>Lowest</div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Quick fill empty scores:</span>
              {[0, 50, 60, 70, 80, 90, 100].map(v => (
                <button
                  key={v}
                  style={styles.quickFillBtn}
                  onClick={() => fillAll(v)}
                  title={`Set all empty scores to ${v}`}
                >
                  {v}%
                </button>
              ))}
            </div>
            <button
              style={{ ...styles.btnOutline, opacity: learners.length ? 1 : 0.6 }}
              onClick={exportMarksExcel}
              disabled={!learners.length}
            >
              Export Excel
            </button>
            <button
              style={{ ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : `Save All ${learners.length} Scores`}
            </button>
          </div>

          {/* ── Score table ── */}
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Adm No</th>
                  <th style={styles.th}>Learner Name</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Gender</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Score (out of 100)</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Weighted</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Absent</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, idx) => {
                  const weight = sessionInfo?.exam_type === "mid_term" ? 0.4 : 0.6;
                  const weighted = l.score !== "" && !l.is_absent
                    ? (Number(l.score) * weight).toFixed(1)
                    : "—";
                  const rowBg = l.is_absent
                    ? "#fef2f2"
                    : idx % 2 === 0 ? "#fff" : "#f9fafb";

                  return (
                    <tr key={l.id} style={{ background: rowBg }}>
                      <td style={{ ...styles.td, color: "#9ca3af", width: 40 }}>{idx + 1}</td>
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
                        ) : (
                          <div style={styles.scoreInputWrap}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={l.score}
                              onChange={e => handleScoreChange(idx, e.target.value)}
                              style={{
                                ...styles.scoreInput,
                                borderColor: l.score === "" ? "#fca5a5"
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
                        {weighted !== "—" ? `${weighted}%` : "—"}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <label style={styles.absentToggle}>
                          <input
                            type="checkbox"
                            checked={l.is_absent}
                            onChange={() => handleAbsentToggle(idx)}
                            style={{ width: 16, height: 16, cursor: "pointer" }}
                          />
                        </label>
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        {l.is_absent ? (
                          <span style={styles.statusAbsent}>Absent</span>
                        ) : l.saved ? (
                          <span style={styles.statusSaved}>✓ Saved</span>
                        ) : l.score !== "" ? (
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

          {/* ── Bottom save bar ── */}
          <div style={styles.bottomBar}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {enteredCount} of {learners.length - absentCount} scores entered
              {absentCount > 0 && ` · ${absentCount} absent`}
            </div>
            <button
              style={{ ...styles.btnPrimary, padding: "11px 28px", fontSize: 15 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save All Scores"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { padding: "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 80 },

  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  breadcrumb: { fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  unsavedBadge: { background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, alignSelf: "center" },

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", cursor: "pointer", fontFamily: "inherit" },

  sessionPill: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  examTypeBadge: { padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  sessionDate: { fontSize: 13, color: "#6b7280" },

  alertError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  alertSuccess: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },

  emptyPrompt: { textAlign: "center", padding: "60px 20px", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" },
  emptyIcon: { fontSize: 48 },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  statsBar: { display: "flex", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 24px", marginBottom: 16, gap: 0, alignItems: "center" },
  statItem: { flex: 1, textAlign: "center" },
  statVal: { fontSize: 22, fontWeight: 800, color: "#111827", fontVariantNumeric: "tabular-nums" },
  statLbl: { fontSize: 11, color: "#9ca3af", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 36, background: "#e5e7eb", margin: "0 4px" },

  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  quickFillBtn: { padding: "5px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 600 },

  tableCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 14px", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 14px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },

  scoreInputWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  scoreInput: { width: 76, padding: "7px 10px", border: "2px solid", borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums", fontFamily: "inherit" },
  pctLabel: { fontSize: 13, color: "#9ca3af", fontWeight: 600 },
  absentText: { color: "#ef4444", fontStyle: "italic", fontSize: 13 },

  genderBadge: { display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 },
  absentToggle: { display: "flex", justifyContent: "center", cursor: "pointer" },

  statusSaved: { background: "#dcfce7", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusPending: { background: "#fef9c3", color: "#a16207", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusEmpty: { background: "#fee2e2", color: "#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusAbsent: { background: "#f3f4f6", color: "#6b7280", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, boxShadow: "0 -4px 12px rgba(0,0,0,0.06)" },
  btnPrimary: { padding: "9px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnOutline: { padding: "9px 18px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
