// ============================================================================
// EXCEL EXPORT UTILITY
// Utilities for exporting data to Excel files
// ============================================================================

const ExcelJS = require('exceljs');

/**
 * Create a styled header row for Excel
 */
const createHeaderRow = (worksheet, headers) => {
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  return headerRow;
};

/**
 * Auto-fit column widths
 */
const autoFitColumns = (worksheet, columns) => {
  columns.forEach((col, index) => {
    const column = worksheet.columns[index];
    let maxLength = col.length;
    
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const cell = worksheet.getRow(i).getCell(index + 1);
      if (cell.value) {
        const cellLength = String(cell.value).length;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      }
    }
    column.width = Math.min(maxLength + 2, 50);
  });
};

/**
 * Export class list (learners in a stream) to Excel
 * @param {Array} learners - Array of learner objects
 * @param {string} className - Name of the class
 * @param {string} streamName - Name of the stream
 * @returns {Promise<Buffer>} Excel file buffer
 */
const exportClassList = async (learners, className, streamName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class List');

  // Add title
  const titleRow = worksheet.addRow([`${className} - ${streamName} - Class List`]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.mergeCells('A1:F1');

  // Add date
  const dateRow = worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
  dateRow.font = { size: 10, italic: true };
  worksheet.mergeCells('A2:F2');

  // Add empty row
  worksheet.addRow([]);

  // Create headers
  const headers = ['#', 'Admission Number', 'First Name', 'Last Name', 'Gender', 'Email'];
  createHeaderRow(worksheet, headers);

  // Add data rows
  learners.forEach((learner, index) => {
    worksheet.addRow([
      index + 1,
      learner.admission_number || '',
      learner.first_name || '',
      learner.last_name || '',
      learner.gender || '',
      learner.email || '',
    ]);
  });

  // Auto-fit columns
  autoFitColumns(worksheet, headers);

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

/**
 * Export stream marks to Excel
 * @param {Array} results - Array of final result objects
 * @param {string} className - Name of the class
 * @param {string} streamName - Name of the stream
 * @param {string} termName - Name of the term
 * @returns {Promise<Buffer>} Excel file buffer
 */
const exportStreamMarks = async (results, className, streamName, termName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stream Marks');

  // Add title
  const titleRow = worksheet.addRow([`${className} - ${streamName} - ${termName} Results`]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.mergeCells('A1:G1');

  // Add date
  const dateRow = worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
  dateRow.font = { size: 10, italic: true };
  worksheet.mergeCells('A2:G2');

  // Add empty row
  worksheet.addRow([]);

  // Group results by learner
  const learnerMap = {};
  results.forEach((result) => {
    const learnerId = result.learner_id;
    if (!learnerMap[learnerId]) {
      learnerMap[learnerId] = {
        learner_id: learnerId,
        admission_number: result.admission_number,
        first_name: result.first_name,
        last_name: result.last_name,
        subjects: [],
      };
    }
    learnerMap[learnerId].subjects.push({
      subject_name: result.subject_name,
      mid_term_score: result.mid_term_score,
      end_term_score: result.end_term_score,
      grade: result.grade,
      final_score: result.final_score,
    });
  });

  const learners = Object.values(learnerMap);

  // Get all unique subjects
  const subjectSet = new Set();
  results.forEach((result) => {
    subjectSet.add(result.subject_name);
  });
  const subjects = Array.from(subjectSet).sort();

  // Create headers
  const headers = ['#', 'Admission No.', 'First Name', 'Last Name', ...subjects.flatMap(s => [`${s} (Mid)`, `${s} (End)`, `${s} (Grade)`])];
  createHeaderRow(worksheet, headers);

  // Add data rows
  learners.forEach((learner, index) => {
    const row = [
      index + 1,
      learner.admission_number || '',
      learner.first_name || '',
      learner.last_name || '',
    ];

    subjects.forEach((subject) => {
      const subjectResult = learner.subjects.find(s => s.subject_name === subject);
      if (subjectResult) {
        row.push(subjectResult.mid_term_score || '');
        row.push(subjectResult.end_term_score || '');
        row.push(subjectResult.grade || 'N/A');
      } else {
        row.push('');
        row.push('');
        row.push('');
      }
    });

    worksheet.addRow(row);
  });

  // Auto-fit columns
  autoFitColumns(worksheet, headers);

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

/**
 * Export users to Excel
 * @param {Array} users - Array of user objects
 * @returns {Promise<Buffer>} Excel file buffer
 */
const exportUsers = async (users) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  // Add title
  const titleRow = worksheet.addRow(['System Users Directory']);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.mergeCells('A1:H1');

  // Add date
  const dateRow = worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
  dateRow.font = { size: 10, italic: true };
  worksheet.mergeCells('A2:H2');

  // Add empty row
  worksheet.addRow([]);

  // Create headers
  const headers = ['#', 'Username', 'Email', 'First Name', 'Last Name', 'Phone', 'Role', 'Status'];
  createHeaderRow(worksheet, headers);

  // Add data rows
  users.forEach((user, index) => {
    worksheet.addRow([
      index + 1,
      user.username || '',
      user.email || '',
      user.first_name || '',
      user.last_name || '',
      user.phone_number || '',
      user.role || '',
      user.is_active ? 'Active' : 'Inactive',
    ]);
  });

  // Auto-fit columns
  autoFitColumns(worksheet, headers);

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  exportClassList,
  exportStreamMarks,
  exportUsers,
  createHeaderRow,
  autoFitColumns,
};
