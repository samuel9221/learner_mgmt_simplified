const pool = require('../config/database');
const puppeteer = require('puppeteer');
const { getAllGradingScales } = require('../utils/grading.service');

// â”€â”€â”€ Shared: fetch learner report data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REPORT_MODES = {
  mid_term: { title: 'MID TERM REPORT', filename: 'mid_term', examType: 'mid_term' },
  end_of_term: { title: 'END OF TERM REPORT', filename: 'end_of_term', examType: 'end_of_term' },
  combined: { title: 'COMBINED MID & END OF TERM REPORT', filename: 'combined', examType: null },
};

const _reportMode = (value) => REPORT_MODES[value] ? value : 'combined';

const _getLearnerReportData = async (learnerId, termId, mode = 'combined') => {
  const reportMode = _reportMode(mode);
  const learner = await pool.query(
    `SELECT l.*,
            c.class_name, st.stream_name,
            ay.year_name, t.term_number,
            u.first_name || ' ' || u.last_name AS class_teacher_name
     FROM learners l
     JOIN learner_enrollments le ON l.id = le.learner_id AND le.academic_year_id = (
       SELECT academic_year_id FROM terms WHERE id = $2
     )
     JOIN classes c ON le.class_id = c.id
     LEFT JOIN streams st ON le.stream_id = st.id
     LEFT JOIN users u ON c.class_teacher_id = u.id
     JOIN terms t ON t.id = $2
     JOIN academic_years ay ON t.academic_year_id = ay.id
     WHERE l.id = $1`,
    [learnerId, termId]
  );

  const results = reportMode === 'combined'
    ? await pool.query(
      `SELECT fr.*,
              s.subject_name, s.subject_code
       FROM final_results fr
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.learner_id = $1 AND fr.term_id = $2
       ORDER BY s.subject_name`,
      [learnerId, termId]
    )
    : await pool.query(
      `SELECT er.learner_id, er.subject_id, er.stream_id,
              CASE WHEN es.exam_type = 'mid_term' THEN er.score END AS mid_term_score,
              CASE WHEN es.exam_type = 'end_of_term' THEN er.score END AS end_term_score,
              er.score AS final_score,
              gs.label AS grade,
              gs.remarks,
              s.subject_name, s.subject_code
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       JOIN subjects s ON er.subject_id = s.id
       LEFT JOIN grading_scales gs
         ON er.score IS NOT NULL
        AND er.score >= gs.min_score
        AND er.score <= gs.max_score
        AND gs.is_active = TRUE
       WHERE er.learner_id = $1
         AND es.term_id = $2
         AND es.exam_type = $3
       ORDER BY s.subject_name`,
      [learnerId, termId, REPORT_MODES[reportMode].examType]
    );

  const reportCard = await pool.query(
    `SELECT * FROM report_cards WHERE learner_id = $1 AND term_id = $2`,
    [learnerId, termId]
  );

  const summary = reportMode === 'combined'
    ? await pool.query(
      `SELECT ROUND(AVG(final_score), 2) AS overall_average,
              MIN(stream_rank) AS stream_position,
              MIN(class_rank) AS class_position,
              COUNT(*) AS total_subjects
       FROM final_results
       WHERE learner_id = $1 AND term_id = $2`,
      [learnerId, termId]
    )
    : await pool.query(
      `SELECT ROUND(AVG(er.score), 2) AS overall_average,
              NULL::integer AS stream_position,
              NULL::integer AS class_position,
              COUNT(*) AS total_subjects
       FROM exam_results er
       JOIN exam_sessions es ON er.exam_session_id = es.id
       WHERE er.learner_id = $1
         AND es.term_id = $2
         AND es.exam_type = $3`,
      [learnerId, termId, REPORT_MODES[reportMode].examType]
    );

  const schoolConfig = await pool.query(
    `SELECT config_key, config_value FROM system_config
     WHERE config_key IN ('school_name','school_motto','school_address','school_phone')`
  );

  const school = {};
  schoolConfig.rows.forEach(r => { school[r.config_key] = r.config_value; });

  return {
    learner: learner.rows[0],
    results: results.rows,
    report_card: reportCard.rows[0] || null,
    summary: summary.rows[0],
    school,
    grading_scales: await getAllGradingScales(),
    report_mode: REPORT_MODES[reportMode],
  };
};

// GET /api/reports/learner/:learnerId/term/:termId  (JSON)
const getLearnerReport = async (req, res) => {
  try {
    const { learnerId, termId } = req.params;
    const data = await _getLearnerReportData(learnerId, termId, req.query.mode);
    if (!data.learner)
      return res.status(404).json({ success: false, message: 'Learner or term not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('getLearnerReport:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reports/stream/:streamId/term/:termId  (JSON)
const getStreamReport = async (req, res) => {
  try {
    const { streamId, termId } = req.params;

    const streamInfo = await pool.query(
      `SELECT st.*, c.class_name,
              u.first_name || ' ' || u.last_name AS stream_teacher_name
       FROM streams st
       JOIN classes c ON st.class_id = c.id
       LEFT JOIN users u ON st.stream_teacher_id = u.id
       WHERE st.id = $1`,
      [streamId]
    );

    const learners = await pool.query(
      `SELECT DISTINCT l.id, l.admission_number,
              l.first_name || ' ' || l.last_name AS learner_name,
              l.gender
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       WHERE fr.stream_id = $1 AND fr.term_id = $2
       ORDER BY l.admission_number`,
      [streamId, termId]
    );

    const results = await pool.query(
      `SELECT fr.*, l.admission_number,
              l.first_name || ' ' || l.last_name AS learner_name,
              s.subject_name
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       JOIN subjects s ON fr.subject_id = s.id
       WHERE fr.stream_id = $1 AND fr.term_id = $2
       ORDER BY l.admission_number, s.subject_name`,
      [streamId, termId]
    );

    res.json({
      success: true,
      data: {
        stream: streamInfo.rows[0],
        learners: learners.rows,
        results: results.rows,
        grading_scales: await getAllGradingScales(),
      }
    });
  } catch (err) {
    console.error('getStreamReport:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reports/subject/:subjectId/term/:termId  (JSON)
const getSubjectReport = async (req, res) => {
  try {
    const { subjectId, termId } = req.params;

    const subject = await pool.query(`SELECT * FROM subjects WHERE id = $1`, [subjectId]);

    const results = await pool.query(
      `SELECT fr.*,
              l.admission_number,
              l.first_name || ' ' || l.last_name AS learner_name,
              st.stream_name, c.class_name
       FROM final_results fr
       JOIN learners l ON fr.learner_id = l.id
       LEFT JOIN streams st ON fr.stream_id = st.id
       LEFT JOIN classes c ON st.class_id = c.id
       WHERE fr.subject_id = $1 AND fr.term_id = $2
       ORDER BY c.class_name, st.stream_name, l.admission_number`,
      [subjectId, termId]
    );

    res.json({
      success: true,
      data: {
        subject: subject.rows[0],
        results: results.rows,
        grading_scales: await getAllGradingScales(),
      }
    });
  } catch (err) {
    console.error('getSubjectReport:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// â”€â”€â”€ PDF Generation Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _generatePdf = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
  });
  await browser.close();
  return pdf;
};

// â”€â”€â”€ HTML Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _buildLearnerReportHtml = (data) => {
  const { learner, results, summary, report_card, school, grading_scales, report_mode } = data;
  const isCombined = !report_mode.examType;
  const scoreHeader = report_mode.examType === 'mid_term' ? 'Mid Term' : 'End of Term';
  const fmt = (value) => value === null || value === undefined ? '-' : Number(value).toFixed(1).replace(/\.0$/, '');
  const total = results.reduce((sum, r) => sum + (Number(r.final_score) || 0), 0);
  const average = summary.overall_average || (results.length ? (total / results.length).toFixed(2) : null);
  const overallScale = grading_scales.find(g => average !== null && Number(average) >= Number(g.min_score) && Number(average) <= Number(g.max_score));

  const rows = results.map(r => `
    <tr>
      <td>${r.subject_name}</td>
      ${isCombined
        ? `<td class="center">${fmt(r.mid_term_score)}</td>
           <td class="center">${fmt(r.end_term_score)}</td>
           <td class="center bold">${fmt(r.final_score)}</td>`
        : `<td class="center bold">${fmt(r.final_score)}</td>`}
      <td class="center grade">${r.grade || '-'}</td>
      <td>${r.remarks || ''}</td>
    </tr>`).join('');

  const scaleRows = grading_scales.map(g => `
    <tr>
      <td class="center bold">${g.label}</td>
      <td>${g.grade_name}</td>
      <td class="center">${g.min_score} - ${g.max_score}</td>
      <td>${g.remarks}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 0 12px 10px; }
  .letterhead-space { height: 30mm; }
  .report-title { text-align: center; font-size: 15px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }
  .info-grid { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 0; margin-bottom: 8px; border: 1px solid #93c5fd; color: #0f172a; }
  .info-grid div { padding: 5px 7px; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; min-height: 22px; }
  .info-grid div:nth-child(3n) { border-right: 0; }
  .info-grid span { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f8fafc; color: #111827; padding: 5px 6px; text-align: left; font-size: 9px; border: 1px solid #cbd5e1; text-transform: uppercase; }
  td { padding: 5px 6px; border: 1px solid #d1d5db; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .grade { font-weight: bold; }
  .summary-table th, .summary-table td { text-align: center; font-weight: 700; }
  .lower-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
  .remarks-section { margin-bottom: 7px; border: 1px solid #d1d5db; min-height: 34px; padding: 7px; }
  .remarks-section h4 { font-size: 10px; color: #1d4ed8; margin-bottom: 4px; }
  .scale-title { font-size: 10px; font-weight: bold; margin-bottom: 4px; color: #111827; }
  .footer { margin-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #555; }
  .sign-line { margin-top: 22px; display: flex; justify-content: space-between; }
  .sign-line div { text-align: center; }
  .sign-line div .line { border-top: 1px solid #333; width: 160px; margin: 20px auto 4px; }
</style>
</head>
<body>
  <div class="letterhead-space"></div>
  <div class="report-title">${report_mode.title}</div>

  <div class="info-grid">
    <div>Name: <span>${learner.first_name} ${learner.middle_name || ''} ${learner.last_name}</span></div>
    <div>Adm No: <span>${learner.admission_number}</span></div>
    <div>Sex: <span>${learner.gender || '-'}</span></div>
    <div>Class: <span>${learner.class_name} ${learner.stream_name || ''}</span></div>
    <div>Term: <span>${learner.term_number}</span></div>
    <div>Year: <span>${learner.year_name}</span></div>
    <div>Class Teacher: <span>${learner.class_teacher_name || 'N/A'}</span></div>
    <div>Date of Birth: <span>${learner.date_of_birth ? new Date(learner.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
    <div>School: <span>${school.school_name || ''}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        ${isCombined
          ? '<th class="center">Mid Term</th><th class="center">End of Term</th><th class="center">Average Mark</th>'
          : `<th class="center">${scoreHeader}</th>`}
        <th class="center">Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="summary-table">
    <tr>
      <th>Total</th><th>Average Score</th><th>Overall Descriptor</th><th>Stream Pos</th><th>Class Pos</th><th>Days Present</th>
    </tr>
    <tr>
      <td>${fmt(total)}</td><td>${average || 'N/A'}</td><td>${overallScale?.remarks || overallScale?.grade_name || '-'}</td>
      <td>${summary.stream_position || 'N/A'}</td><td>${summary.class_position || 'N/A'}</td><td>${report_card?.days_present || '-'}</td>
    </tr>
  </table>

  <div class="lower-grid">
    <div>
      <div class="remarks-section">
        <h4>Class Teacher's Remarks</h4>
        ${report_card?.class_teacher_remarks || '&nbsp;'}
      </div>
      <div class="remarks-section">
        <h4>Head Teacher's Remarks</h4>
        ${report_card?.head_teacher_remarks || '&nbsp;'}
      </div>
    </div>
    <div>
      <div class="scale-title">Grading Scale</div>
      <table>
        <thead>
          <tr><th>Grade</th><th>Name</th><th>Score Range</th><th>Description</th></tr>
        </thead>
        <tbody>${scaleRows}</tbody>
      </table>
    </div>
  </div>

  <div class="sign-line">
    <div><div class="line"></div><div>Class Teacher</div></div>
    <div><div class="line"></div><div>Head Teacher</div></div>
    <div><div class="line"></div><div>Parent / Guardian</div></div>
  </div>

  <div class="footer">
    <span>${school.school_address || ''} | ${school.school_phone || ''}</span>
    <span>Generated: ${new Date().toLocaleDateString()}</span>
  </div>
</body>
</html>`;
};
// GET /api/reports/learner/:learnerId/term/:termId/pdf
const getLearnerReportPdf = async (req, res) => {
  try {
    const { learnerId, termId } = req.params;
    const data = await _getLearnerReportData(learnerId, termId, req.query.mode);
    if (!data.learner)
      return res.status(404).json({ success: false, message: 'Learner or term not found' });

    const html = _buildLearnerReportHtml(data);
    const pdf = await _generatePdf(html);

    const filename = `report_${data.learner.admission_number}_term${data.learner.term_number}_${data.report_mode.filename}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    console.error('getLearnerReportPdf:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// GET /api/reports/stream/:streamId/term/:termId/pdf  (bulk - all learners)
const getStreamReportPdf = async (req, res) => {
  try {
    const { streamId, termId } = req.params;
    const mode = _reportMode(req.query.mode);

    const learnerIds = mode === 'combined'
      ? await pool.query(
        `SELECT DISTINCT learner_id FROM final_results WHERE stream_id = $1 AND term_id = $2`,
        [streamId, termId]
      )
      : await pool.query(
        `SELECT DISTINCT er.learner_id
         FROM exam_results er
         JOIN exam_sessions es ON er.exam_session_id = es.id
         WHERE er.stream_id = $1 AND es.term_id = $2 AND es.exam_type = $3`,
        [streamId, termId, REPORT_MODES[mode].examType]
      );

    if (!learnerIds.rows.length)
      return res.status(404).json({ success: false, message: 'No results found for this stream and term' });

    // Build one HTML page per learner, concatenated
    const pages = await Promise.all(
      learnerIds.rows.map(async (row) => {
        const data = await _getLearnerReportData(row.learner_id, termId, mode);
        return _buildLearnerReportHtml(data);
      })
    );

    // Combine with page breaks
    const combined = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        .page-break { page-break-after: always; }
        body { margin: 0; padding: 0; }
      </style>
    </head><body>
      ${pages.map((p, i) => {
        const bodyContent = p.replace(/<!DOCTYPE html>.*?<body>/s, '').replace(/<\/body>.*?<\/html>/s, '');
        return `<div style="padding: 20px;">${bodyContent}</div>${i < pages.length - 1 ? '<div class="page-break"></div>' : ''}`;
      }).join('')}
    </body></html>`;

    const pdf = await _generatePdf(combined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stream_report_${REPORT_MODES[mode].filename}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('getStreamReportPdf:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// GET /api/reports/subject/:subjectId/term/:termId/pdf
const getSubjectReportPdf = async (req, res) => {
  try {
    const { subjectId, termId } = req.params;
    const mode = _reportMode(req.query.mode);
    const subject = await pool.query(`SELECT * FROM subjects WHERE id = $1`, [subjectId]);
    const termInfo = await pool.query(
      `SELECT t.term_number, ay.year_name FROM terms t JOIN academic_years ay ON t.academic_year_id = ay.id WHERE t.id = $1`,
      [termId]
    );

    const results = mode === 'combined'
      ? await pool.query(
        `SELECT fr.*, l.admission_number,
                l.first_name || ' ' || l.last_name AS learner_name,
                st.stream_name, c.class_name
         FROM final_results fr
         JOIN learners l ON fr.learner_id = l.id
         LEFT JOIN streams st ON fr.stream_id = st.id
         LEFT JOIN classes c ON st.class_id = c.id
         WHERE fr.subject_id = $1 AND fr.term_id = $2
         ORDER BY c.class_name, st.stream_name, l.admission_number`,
        [subjectId, termId]
      )
      : await pool.query(
        `SELECT er.learner_id, er.subject_id, er.stream_id,
                CASE WHEN es.exam_type = 'mid_term' THEN er.score END AS mid_term_score,
                CASE WHEN es.exam_type = 'end_of_term' THEN er.score END AS end_term_score,
                er.score AS final_score,
                gs.label AS grade,
                l.admission_number,
                l.first_name || ' ' || l.last_name AS learner_name,
                st.stream_name, c.class_name
         FROM exam_results er
         JOIN exam_sessions es ON er.exam_session_id = es.id
         JOIN learners l ON er.learner_id = l.id
         LEFT JOIN streams st ON er.stream_id = st.id
         LEFT JOIN classes c ON st.class_id = c.id
         LEFT JOIN grading_scales gs
           ON er.score IS NOT NULL
          AND er.score >= gs.min_score
          AND er.score <= gs.max_score
          AND gs.is_active = TRUE
         WHERE er.subject_id = $1 AND es.term_id = $2 AND es.exam_type = $3
         ORDER BY c.class_name, st.stream_name, l.admission_number`,
        [subjectId, termId, REPORT_MODES[mode].examType]
      );

    const rows = results.rows.map(r => `
      <tr>
        <td>${r.admission_number}</td>
        <td>${r.learner_name}</td>
        <td>${r.class_name} ${r.stream_name || ''}</td>
        ${mode === 'combined'
          ? `<td class="center">${r.mid_term_score !== null ? r.mid_term_score + '%' : '-'}</td>
             <td class="center">${r.end_term_score !== null ? r.end_term_score + '%' : '-'}</td>
             <td class="center bold">${r.final_score !== null ? r.final_score + '%' : '-'}</td>`
          : `<td class="center bold">${r.final_score !== null ? r.final_score + '%' : '-'}</td>`}
        <td class="center">${r.grade || '-'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
  h2 { text-align: center; margin-bottom: 4px; }
  h4 { text-align: center; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2c3e50; color: #fff; padding: 7px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f5f5f5; }
  .center { text-align: center; } .bold { font-weight: bold; }
</style>
</head><body>
  <h2>${subject.rows[0]?.subject_name} - ${REPORT_MODES[mode].title}</h2>
  <h4>Term ${termInfo.rows[0]?.term_number} | ${termInfo.rows[0]?.year_name}</h4>
  <table>
    <thead>
      <tr><th>Adm No</th><th>Learner</th><th>Class/Stream</th>
          ${mode === 'combined'
            ? '<th class="center">Mid Term</th><th class="center">End of Term</th><th class="center">Final</th>'
            : `<th class="center">${REPORT_MODES[mode].title}</th>`}
          <th class="center">Grade</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

    const pdf = await _generatePdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="subject_report_${REPORT_MODES[mode].filename}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('getSubjectReportPdf:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// GET /api/reports/class/:classId/term/:termId/pdf
const getClassReportPdf = async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const mode = _reportMode(req.query.mode);

    const learnerIds = mode === 'combined'
      ? await pool.query(
        `SELECT DISTINCT fr.learner_id
         FROM final_results fr
         JOIN streams st ON fr.stream_id = st.id
         WHERE st.class_id = $1 AND fr.term_id = $2`,
        [classId, termId]
      )
      : await pool.query(
        `SELECT DISTINCT er.learner_id
         FROM exam_results er
         JOIN exam_sessions es ON er.exam_session_id = es.id
         JOIN streams st ON er.stream_id = st.id
         WHERE st.class_id = $1 AND es.term_id = $2 AND es.exam_type = $3`,
        [classId, termId, REPORT_MODES[mode].examType]
      );

    if (!learnerIds.rows.length)
      return res.status(404).json({ success: false, message: 'No results found for this class and term' });

    const pages = await Promise.all(
      learnerIds.rows.map(async (row) => {
        const data = await _getLearnerReportData(row.learner_id, termId, mode);
        return _buildLearnerReportHtml(data);
      })
    );

    const combined = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>.page-break { page-break-after: always; } body { margin: 0; padding: 0; }</style>
    </head><body>
      ${pages.map((p, i) => {
        const bodyContent = p.replace(/<!DOCTYPE html>.*?<body>/s, '').replace(/<\/body>.*?<\/html>/s, '');
        return `<div style="padding: 20px;">${bodyContent}</div>${i < pages.length - 1 ? '<div class="page-break"></div>' : ''}`;
      }).join('')}
    </body></html>`;

    const pdf = await _generatePdf(combined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="class_report_${REPORT_MODES[mode].filename}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('getClassReportPdf:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

module.exports = {
  getLearnerReport, getStreamReport, getSubjectReport,
  getLearnerReportPdf, getStreamReportPdf, getSubjectReportPdf, getClassReportPdf,
};

