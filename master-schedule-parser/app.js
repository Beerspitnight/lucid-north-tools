/**
 * Master Schedule Parser
 * Parses Excel master schedules with multiline cells and exports to CSV
 */

// ============================================================================
// Core Parser Functions
// ============================================================================

/**
 * Parses a multiline Excel cell like:
 * "AP Statistics\n      FY  Room:B208  Days:A\nGeometry\n      FY  Room:B208  Days:B"
 *
 * Returns: { aDayClasses: [{course, room, type}], bDayClasses: [...] }
 */
function parsePeriodCell(cellValue) {
  if (!cellValue || cellValue.trim() === '') {
    return { aDayClasses: [], bDayClasses: [] };
  }

  const lines = cellValue.split('\n');
  const aDayClasses = [];
  const bDayClasses = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if next line is a details line (contains Room: or Days:)
    const hasDetailsLine = (i + 1 < lines.length) &&
                          (lines[i + 1].includes('Room:') || lines[i + 1].includes('Days:'));

    if (hasDetailsLine) {
      const course = line.trim();
      const detailsLine = lines[i + 1];

      // Extract room, type (FY/S1/S2/Q1/Q2/Q3/Q4), and days
      const roomMatch = detailsLine.match(/Room:(\S+)/);
      const typeMatch = detailsLine.match(/(FY|S1|S2|Q1|Q2|Q3|Q4)/);
      const daysMatch = detailsLine.match(/Days:\s*([AB])/);

      const room = roomMatch ? roomMatch[1] : '';
      const type = typeMatch ? typeMatch[1] : 'FY';
      const days = daysMatch ? daysMatch[1] : null;

      const classObj = { course, room, type };

      // If specific day is mentioned, add to that day; otherwise add to both
      if (days === 'A') {
        aDayClasses.push(classObj);
      } else if (days === 'B') {
        bDayClasses.push(classObj);
      } else {
        // No specific day mentioned, add to both
        aDayClasses.push(classObj);
        bDayClasses.push(classObj);
      }

      i += 2;
    } else {
      // Course line without details, add to both days
      const course = line.trim();
      if (course) {
        const classObj = { course, room: '', type: 'FY' };
        aDayClasses.push(classObj);
        bDayClasses.push(classObj);
      }
      i += 1;
    }
  }

  return { aDayClasses, bDayClasses };
}

/**
 * Formats class array to CSV string: "CourseName (Room: ROOM)" or just course name
 */
function formatClassForCsv(classes) {
  if (!classes || classes.length === 0) return '';

  const firstClass = classes[0];
  if (firstClass.room) {
    return `${firstClass.course} (Room: ${firstClass.room})`;
  }
  return firstClass.course;
}

/**
 * Case-insensitive header matching — returns original header string or null.
 */
function findColumn(headers, possibleNames) {
  const lowerMap = {};
  headers.forEach(h => { lowerMap[h.toLowerCase().trim()] = h; });
  for (const name of possibleNames) {
    const match = lowerMap[name.toLowerCase().trim()];
    if (match) return match;
  }
  return null;
}

/**
 * Levenshtein distance for typo detection (standard DP implementation)
 */
function levenshteinDistance(a, b) {
  const aLen = a.length;
  const bLen = b.length;

  const dp = Array(aLen + 1).fill(null).map(() => Array(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) dp[i][0] = i;
  for (let j = 0; j <= bLen; j++) dp[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,     // deletion
        dp[i][j - 1] + 1,     // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[aLen][bLen];
}

/**
 * CSV escaping: wrap in quotes if contains comma, quote, or newline
 */
function escapeCsv(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Main parser: reads Excel sheet and returns parsed teacher data.
 * Each "Period X" column is expanded into "Period X A Day" and "Period X B Day".
 */
function parseExcelSchedule(workbook, sheetName, nonTeachingLabelsStr) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!data.length) {
    return { headers: ['Department', 'Teacher'], teachers: [], periodCols: [] };
  }

  const nonTeachingSet = new Set(
    nonTeachingLabelsStr.split(',').map(s => s.trim().toLowerCase())
  );

  // Find columns by name
  const headers = Object.keys(data[0]);
  const teacherColName = findColumnName(headers, ['Teacher Name', 'Teacher', 'Name', 'Staff', 'Staff Name', 'Instructor']);
  const deptColName = findColumnName(headers, ['Department', 'Dept', 'Subject', 'Subject Area']);

  // Detect period columns (any header containing "Period", case-insensitive)
  const periodColNames = headers.filter(h => h.toLowerCase().includes('period'));

  // Build output rows — each period column expands into A Day + B Day
  const teachers = [];

  for (const row of data) {
    const teacherName = teacherColName ? String(row[teacherColName] || '').trim() : '';
    const dept = deptColName ? String(row[deptColName] || '').trim() : '';

    if (!teacherName) continue;

    const outputRow = [dept, teacherName];

    for (const periodCol of periodColNames) {
      const cellValue = String(row[periodCol] || '').trim();

      // Check if non-teaching label
      if (nonTeachingSet.has(cellValue.toLowerCase())) {
        outputRow.push('Prep'); // A Day
        outputRow.push('Prep'); // B Day
        continue;
      }

      // Parse the multiline cell into A/B day classes
      const { aDayClasses, bDayClasses } = parsePeriodCell(cellValue);

      const aDayFormatted = formatClassForCsv(aDayClasses) || 'Prep';
      const bDayFormatted = formatClassForCsv(bDayClasses) || 'Prep';
      outputRow.push(aDayFormatted);
      outputRow.push(bDayFormatted);
    }

    teachers.push({
      teacher: teacherName,
      dept,
      data: outputRow
    });
  }

  // Build output headers with A Day / B Day expansion
  const outputHeaders = ['Department', 'Teacher'];
  for (const periodCol of periodColNames) {
    outputHeaders.push(`${periodCol} A Day`);
    outputHeaders.push(`${periodCol} B Day`);
  }

  return {
    headers: outputHeaders,
    teachers,
    periodCols: periodColNames
  };
}

/**
 * Find column name (returns the original header string, not index).
 */
function findColumnName(headers, possibleNames) {
  const lowerMap = {};
  headers.forEach(h => { lowerMap[h.toLowerCase().trim()] = h; });
  for (const name of possibleNames) {
    const match = lowerMap[name.toLowerCase().trim()];
    if (match) return match;
  }
  return null;
}

/**
 * Validation: checks for errors and warnings
 */
function validateSchedule(teachers, nonTeachingLabelsStr) {
  const issues = [];
  const nonTeachingSet = new Set(
    nonTeachingLabelsStr.split(',').map(s => s.trim().toLowerCase())
  );

  const seenTeachers = new Set();
  const allCoursesStr = [];

  for (const teacher of teachers) {
    // Error: missing teacher name
    if (!teacher.teacher || teacher.teacher.trim() === '') {
      issues.push({ severity: 'error', message: 'Missing teacher name in one row' });
    }

    // Warning: duplicate teacher
    const teacherLower = teacher.teacher.toLowerCase();
    if (seenTeachers.has(teacherLower)) {
      issues.push({ severity: 'warning', message: `Duplicate teacher: ${teacher.teacher}` });
    }
    seenTeachers.add(teacherLower);

    // Check for all-prep schedules
    const dataStr = teacher.data.join('|').toLowerCase();
    if (!dataStr.includes('(room:') && teacher.data.slice(2).every(c => c === 'Prep' || c === '')) {
      issues.push({ severity: 'warning', message: `All-prep schedule: ${teacher.teacher}` });
    }

    // Collect all course references for typo detection
    for (let i = 2; i < teacher.data.length; i++) {
      const cell = teacher.data[i];
      if (cell && !cell.includes('(Room:') && cell !== 'Prep') {
        allCoursesStr.push(cell);
      }
    }
  }

  // Typo detection: check for misspellings of non-teaching labels (dedupe first)
  const knownLabels = Array.from(nonTeachingSet);
  const uniqueCourses = [...new Set(allCoursesStr)];
  for (const course of uniqueCourses) {
    const courseLower = course.toLowerCase();
    for (const label of knownLabels) {
      const dist = levenshteinDistance(courseLower, label);
      if (dist > 0 && dist <= 2 && !courseLower.includes('(room:')) {
        issues.push({
          severity: 'warning',
          message: `Possible typo: "${course}" (similar to "${label}")`
        });
        break; // Only warn once per course
      }
    }
  }

  return issues;
}

// ============================================================================
// CSV Generation
// ============================================================================

function generateCsv(headers, teachers) {
  const rows = [];
  rows.push(headers.map(escapeCsv).join(','));

  for (const teacher of teachers) {
    rows.push(teacher.data.map(escapeCsv).join(','));
  }

  return rows.join('\n');
}

// ============================================================================
// UI State & Event Handlers
// ============================================================================

let currentWorkbook = null;
let currentParseResult = null;
let currentIssues = [];

function onFileUpload() {
  const file = document.getElementById('excel-file').files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      currentWorkbook = XLSX.read(e.target.result, { type: 'array' });
      const sheets = currentWorkbook.SheetNames;

      const select = document.getElementById('sheet-select');
      select.innerHTML = '';
      sheets.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });

      // Show upload summary, enable parse button
      document.getElementById('upload-summary').classList.remove('hidden');
      document.getElementById('btn-parse').disabled = false;
    } catch (err) {
      alert(`Error reading file: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function onParse() {
  if (!currentWorkbook) {
    alert('Please upload a file first');
    return;
  }

  const sheetName = document.getElementById('sheet-select').value;
  const nonTeachingLabels = document.getElementById('non-teaching-labels').value;

  try {
    currentParseResult = parseExcelSchedule(currentWorkbook, sheetName, nonTeachingLabels);
    currentIssues = validateSchedule(currentParseResult.teachers, nonTeachingLabels);

    displayReview();

    // Enable Step 2 (review) and Step 3 (download)
    document.getElementById('step-review').classList.remove('disabled');
    document.getElementById('step-download').classList.remove('disabled');

    // Enable download button if no errors
    const hasErrors = currentIssues.some(i => i.severity === 'error');
    document.getElementById('btn-download').disabled = hasErrors;

  } catch (err) {
    alert(`Parse error: ${err.message}`);
  }
}

function displayReview() {
  // Update summary stats
  const errorCount = currentIssues.filter(i => i.severity === 'error').length;
  const warningCount = currentIssues.filter(i => i.severity === 'warning').length;

  document.getElementById('stat-teachers').textContent = currentParseResult.teachers.length;
  document.getElementById('stat-errors').textContent = errorCount;
  document.getElementById('stat-warnings').textContent = warningCount;

  // Show issues (max 20)
  const issuesList = document.getElementById('issues-list');
  const issuesContainer = document.getElementById('issues-container');

  if (currentIssues.length > 0) {
    issuesContainer.classList.remove('hidden');
    issuesList.innerHTML = '';

    currentIssues.slice(0, 20).forEach(issue => {
      const div = document.createElement('div');
      div.className = `issue ${issue.severity}`;
      div.textContent = issue.message;
      issuesList.appendChild(div);
    });

    if (currentIssues.length > 20) {
      const div = document.createElement('div');
      div.className = 'issue info';
      div.textContent = `... and ${currentIssues.length - 20} more issues`;
      issuesList.appendChild(div);
    }
  } else {
    issuesContainer.classList.add('hidden');
  }

  // Build preview table (first 15 teachers, first 8 columns)
  const headerRow = document.getElementById('preview-header');
  const tbody = document.getElementById('preview-body');

  headerRow.innerHTML = '';
  tbody.innerHTML = '';

  // Show first 8 columns of headers
  const displayHeaders = currentParseResult.headers.slice(0, 8);
  displayHeaders.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });

  // Show first 15 rows
  const displayRows = currentParseResult.teachers.slice(0, 15);
  displayRows.forEach(teacher => {
    const tr = document.createElement('tr');
    teacher.data.slice(0, 8).forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // Show truncation note if needed
  const truncNote = document.getElementById('truncation-note');
  if (currentParseResult.teachers.length > 15 || currentParseResult.headers.length > 8) {
    truncNote.classList.remove('hidden');
    let msg = '';
    if (currentParseResult.teachers.length > 15) {
      msg += `Showing 15 of ${currentParseResult.teachers.length} teachers. `;
    }
    if (currentParseResult.headers.length > 8) {
      msg += `Showing 8 of ${currentParseResult.headers.length} columns.`;
    }
    truncNote.textContent = msg;
  } else {
    truncNote.classList.add('hidden');
  }
}

function onDownload() {
  if (!currentParseResult) {
    alert('No data to download');
    return;
  }

  const csv = generateCsv(currentParseResult.headers, currentParseResult.teachers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'master_schedule.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function onStartOver() {
  location.reload();
}

// ============================================================================
// Event Listener Setup
// ============================================================================

document.getElementById('excel-file').addEventListener('change', function() {
  document.getElementById('btn-upload').disabled = !this.files[0];
});

document.getElementById('btn-upload').addEventListener('click', onFileUpload);
document.getElementById('btn-parse').addEventListener('click', onParse);
document.getElementById('btn-download').addEventListener('click', onDownload);
document.getElementById('btn-start-over').addEventListener('click', onStartOver);
