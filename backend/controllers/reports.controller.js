const pool = require('../config/database');
const puppeteer = require('puppeteer');
const { getAllGradingScales } = require('../utils/grading.service');

// ─── Shared: fetch learner report data ───────────────────────────────────────
const _getLearnerReportData = async (learnerId, termId) => {
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

  const results = await pool.query(
    `SELECT fr.*,
            s.subject_name, s.subject_code
     FROM final_results fr
     JOIN subjects s ON fr.subject_id = s.id
     WHERE fr.learner_id = $1 AND fr.term_id = $2
     ORDER BY s.subject_name`,
    [learnerId, termId]
  );

  const reportCard = await pool.query(
    `SELECT * FROM report_cards WHERE learner_id = $1 AND term_id = $2`,
    [learnerId, termId]
  );

  const summary = await pool.query(
    `SELECT ROUND(AVG(final_score), 2) AS overall_average,
            MIN(stream_rank) AS stream_position,
            MIN(class_rank) AS class_position,
            COUNT(*) AS total_subjects
     FROM final_results
     WHERE learner_id = $1 AND term_id = $2`,
    [learnerId, termId]
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
  };
};

// GET /api/reports/learner/:learnerId/term/:termId  (JSON)
const getLearnerReport = async (req, res) => {
  try {
    const { learnerId, termId } = req.params;
    const data = await _getLearnerReportData(learnerId, termId);
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

// ─── PDF Generation Helper ────────────────────────────────────────────────────
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

// ─── HTML Templates ───────────────────────────────────────────────────────────
const _buildLearnerReportHtml = (data) => {
  const { learner, results, summary, report_card, school, grading_scales } = data;

  const rows = results.map(r => `
    <tr>
      <td>${r.subject_name}</td>
      <td class="center">${r.mid_term_score !== null ? r.mid_term_score + '%' : '-'}</td>
      <td class="center">${r.end_term_score !== null ? r.end_term_score + '%' : '-'}</td>
      <td class="center bold">${r.final_score !== null ? r.final_score + '%' : '-'}</td>
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
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 20px; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; font-weight: bold; }
  .header h2 { font-size: 14px; color: #555; margin-top: 2px; }
  .header h3 { font-size: 13px; margin-top: 6px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 16px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; }
  .info-grid span { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #2c3e50; color: #fff; padding: 7px 8px; text-align: left; font-size: 11px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f5f5f5; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .grade { font-weight: bold; font-size: 13px; }
  .summary-box { background: #eaf0fb; border: 1px solid #b3c6f7; border-radius: 4px; padding: 10px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  .summary-box .item { text-align: center; }
  .summary-box .item .val { font-size: 20px; font-weight: bold; color: #2c3e50; }
  .summary-box .item .lbl { font-size: 10px; color: #555; }
  .remarks-section { margin-bottom: 16px; }
  .remarks-section h4 { font-size: 11px; color: #555; margin-bottom: 4px; }
  .remarks-section p { border: 1px solid #ccc; border-radius: 4px; padding: 8px; min-height: 36px; background: #fafafa; }
  .scale-title { font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #555; }
  .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #888; }
  .sign-line { margin-top: 30px; display: flex; justify-content: space-between; }
  .sign-line div { text-align: center; }
  .sign-line div .line { border-top: 1px solid #333; width: 160px; margin: 24px auto 4px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${school.school_name || 'School Name'}</h1>
    <h2>${school.school_motto || ''}</h2>
    <h3>STUDENT REPORT CARD — TERM ${learner.term_number} &nbsp;|&nbsp; ${learner.year_name}</h3>
  </div>

  <div class="info-grid">
    <div>Name: <span>${learner.first_name} ${learner.middle_name || ''} ${learner.last_name}</span></div>
    <div>Adm No: <span>${learner.admission_number}</span></div>
    <div>Class: <span>${learner.class_name} ${learner.stream_name || ''}</span></div>
    <div>Gender: <span>${learner.gender}</span></div>
    <div>Class Teacher: <span>${learner.class_teacher_name || 'N/A'}</span></div>
    <div>Date of Birth: <span>${learner.date_of_birth ? new Date(learner.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
  </div>

  <div class="summary-box">
    <div class="item"><div class="val">${summary.overall_average || 'N/A'}</div><div class="lbl">Overall Average (%)</div></div>
    <div class="item"><div class="val">${summary.stream_position || 'N/A'}</div><div class="lbl">Stream Position</div></div>
    <div class="item"><div class="val">${summary.class_position || 'N/A'}</div><div class="lbl">Class Position</div></div>
    <div class="item"><div class="val">${summary.total_subjects || 0}</div><div class="lbl">Subjects</div></div>
    <div class="item"><div class="val">${report_card?.days_present || '-'}</div><div class="lbl">Days Present</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="center">Mid Term (40%)</th>
        <th class="center">End of Term (60%)</th>
        <th class="center">Final Score</th>
        <th class="center">Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="remarks-section">
    <h4>Class Teacher's Remarks</h4>
    <p>${report_card?.class_teacher_remarks || '&nbsp;'}</p>
  </div>
  <div class="remarks-section">
    <h4>Head Teacher's Remarks</h4>
    <p>${report_card?.head_teacher_remarks || '&nbsp;'}</p>
  </div>

  <div class="scale-title">Grading Scale</div>
  <table>
    <thead>
      <tr><th>Grade</th><th>Name</th><th>Score Range</th><th>Description</th></tr>
    </thead>
    <tbody>${scaleRows}</tbody>
  </table>

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
    const data = await _getLearnerReportData(learnerId, termId);
    if (!data.learner)
      return res.status(404).json({ success: false, message: 'Learner or term not found' });

    const html = _buildLearnerReportHtml(data);
    const pdf = await _generatePdf(html);

    const filename = `report_${data.learner.admission_number}_term${data.learner.term_number}.pdf`;
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

    const learnerIds = await pool.query(
      `SELECT DISTINCT learner_id FROM final_results WHERE stream_id = $1 AND term_id = $2`,
      [streamId, termId]
    );

    if (!learnerIds.rows.length)
      return res.status(404).json({ success: false, message: 'No results found for this stream and term' });

    // Build one HTML page per learner, concatenated
    const pages = await Promise.all(
      learnerIds.rows.map(async (row) => {
        const data = await _getLearnerReportData(row.learner_id, termId);
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
    res.setHeader('Content-Disposition', `attachment; filename="stream_report_term.pdf"`);
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
    const subject = await pool.query(`SELECT * FROM subjects WHERE id = $1`, [subjectId]);
    const termInfo = await pool.query(
      `SELECT t.term_number, ay.year_name FROM terms t JOIN academic_years ay ON t.academic_year_id = ay.id WHERE t.id = $1`,
      [termId]
    );

    const results = await pool.query(
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
    );

    const rows = results.rows.map(r => `
      <tr>
        <td>${r.admission_number}</td>
        <td>${r.learner_name}</td>
        <td>${r.class_name} ${r.stream_name || ''}</td>
        <td class="center">${r.mid_term_score !== null ? r.mid_term_score + '%' : '-'}</td>
        <td class="center">${r.end_term_score !== null ? r.end_term_score + '%' : '-'}</td>
        <td class="center bold">${r.final_score !== null ? r.final_score + '%' : '-'}</td>
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
  <h2>${subject.rows[0]?.subject_name} — Subject Report</h2>
  <h4>Term ${termInfo.rows[0]?.term_number} | ${termInfo.rows[0]?.year_name}</h4>
  <table>
    <thead>
      <tr><th>Adm No</th><th>Learner</th><th>Class/Stream</th>
          <th class="center">Mid Term</th><th class="center">End of Term</th>
          <th class="center">Final</th><th class="center">Grade</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

    const pdf = await _generatePdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="subject_report.pdf"`);
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

    const learnerIds = await pool.query(
      `SELECT DISTINCT fr.learner_id
       FROM final_results fr
       JOIN streams st ON fr.stream_id = st.id
       WHERE st.class_id = $1 AND fr.term_id = $2`,
      [classId, termId]
    );

    if (!learnerIds.rows.length)
      return res.status(404).json({ success: false, message: 'No results found for this class and term' });

    const pages = await Promise.all(
      learnerIds.rows.map(async (row) => {
        const data = await _getLearnerReportData(row.learner_id, termId);
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
    res.setHeader('Content-Disposition', `attachment; filename="class_report.pdf"`);
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