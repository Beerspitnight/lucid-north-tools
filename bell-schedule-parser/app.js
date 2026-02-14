// Global state object
let state = {
  schoolName: '',
  scheduleType: 'traditional',
  hasLunchSplits: false,
  schedules: {
    'Regular Day': {
      periods: [{ name: '', startTime: '', endTime: '' }],
      splitPeriods: {}
    }
  }
};

// ============================================================================
// Time Utilities
// ============================================================================

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateTimeFormat(str) {
  if (!str) return { valid: false, error: 'Time is required' };
  const match = str.match(/^(\d{2}):(\d{2})$/);
  if (!match) return { valid: false, error: 'Time must be in HH:MM format' };
  const [_, hours, minutes] = match;
  const h = parseInt(hours);
  const m = parseInt(minutes);
  if (h < 0 || h > 23) return { valid: false, error: 'Hours must be 00-23' };
  if (m < 0 || m > 59) return { valid: false, error: 'Minutes must be 00-59' };
  return { valid: true, error: null };
}

function validatePeriod(period, scheduleName) {
  const issues = [];

  if (!period.name || period.name.trim() === '') {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: '(unnamed)',
      message: 'Period name is required',
      suggestion: 'Enter a period name (e.g., "Period 1")'
    });
  }

  const startValid = validateTimeFormat(period.startTime);
  if (!startValid.valid) {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: period.name || '(unnamed)',
      message: `Start time: ${startValid.error}`,
      suggestion: 'Use HH:MM format (e.g., 08:00)'
    });
  }

  const endValid = validateTimeFormat(period.endTime);
  if (!endValid.valid) {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: period.name || '(unnamed)',
      message: `End time: ${endValid.error}`,
      suggestion: 'Use HH:MM format (e.g., 09:00)'
    });
  }

  if (startValid.valid && endValid.valid) {
    const startMin = parseTimeToMinutes(period.startTime);
    const endMin = parseTimeToMinutes(period.endTime);

    if (startMin >= endMin) {
      issues.push({
        severity: 'error',
        scheduleName,
        periodName: period.name || '(unnamed)',
        message: 'Start time must be before end time',
        suggestion: `Adjust times (currently ${period.startTime} - ${period.endTime})`
      });
    } else {
      const duration = endMin - startMin;
      if (duration < 5) {
        issues.push({
          severity: 'warning',
          scheduleName,
          periodName: period.name || '(unnamed)',
          message: `Period duration is very short (${duration} minutes)`,
          suggestion: 'Ensure this is intentional'
        });
      }
      if (duration > 120) {
        issues.push({
          severity: 'warning',
          scheduleName,
          periodName: period.name || '(unnamed)',
          message: `Period duration is very long (${duration} minutes)`,
          suggestion: 'Ensure this is intentional'
        });
      }
    }
  }

  return issues;
}

function validateSegment(segment, scheduleName, splitName) {
  // Segments use parsedName/masterName instead of name — build a period-like object for reuse
  const periodLike = {
    name: segment.parsedName,
    startTime: segment.startTime,
    endTime: segment.endTime
  };
  const issues = validatePeriod(periodLike, scheduleName);

  // Override the periodName in issues to show split context
  issues.forEach(issue => {
    issue.periodName = `${splitName} > ${segment.parsedName || '(unnamed)'}`;
  });

  if (!segment.masterName || segment.masterName.trim() === '') {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: `${splitName} > ${segment.parsedName || '(unnamed)'}`,
      message: 'Master period name is required',
      suggestion: 'Enter the master schedule period name for this segment'
    });
  }

  return issues;
}

function validateSplitPeriod(split, scheduleName) {
  const issues = [];

  if (!split.segments || split.segments.length < 2) {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: split.parentName,
      message: 'Split period must have at least 2 segments',
      suggestion: `Add more segments to "${split.parentName}"`
    });
    return issues;
  }

  split.segments.forEach(seg => {
    const segIssues = validateSegment(seg, scheduleName, split.parentName);
    issues.push(...segIssues);
  });

  // Check for overlaps
  const sortedSegments = [...split.segments].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime);
    const bStart = parseTimeToMinutes(b.startTime);
    return aStart - bStart;
  });

  for (let i = 0; i < sortedSegments.length - 1; i++) {
    const cur = sortedSegments[i];
    const next = sortedSegments[i + 1];
    const curEnd = parseTimeToMinutes(cur.endTime);
    const nextStart = parseTimeToMinutes(next.startTime);
    if (curEnd > nextStart) {
      issues.push({
        severity: 'warning',
        scheduleName,
        periodName: split.parentName,
        message: `Segments overlap: "${cur.parsedName}" ends at ${cur.endTime} but next starts at ${next.startTime}`,
        suggestion: 'Adjust segment times to avoid overlaps'
      });
    }
  }

  return issues;
}

function validateSchedule(schedule, scheduleName) {
  const issues = [];

  if (!scheduleName || scheduleName.trim() === '') {
    issues.push({
      severity: 'error',
      scheduleName: '(unnamed)',
      periodName: '',
      message: 'Schedule name is required',
      suggestion: 'Enter a schedule name'
    });
    return issues;
  }

  if (!schedule.periods || schedule.periods.length === 0) {
    issues.push({
      severity: 'error',
      scheduleName,
      periodName: '',
      message: 'Schedule must have at least one period',
      suggestion: 'Add a period in Step 2'
    });
    return issues;
  }

  schedule.periods.forEach(period => {
    const periodIssues = validatePeriod(period, scheduleName);
    issues.push(...periodIssues);
  });

  // Check for duplicate period names
  const periodNames = schedule.periods.map(p => p.name).filter(n => n.trim() !== '');
  const duplicates = periodNames.filter((v, i, a) => a.indexOf(v) !== i);
  duplicates.forEach(dupName => {
    issues.push({
      severity: 'warning',
      scheduleName,
      periodName: dupName,
      message: `Duplicate period name "${dupName}" found`,
      suggestion: 'Rename periods to be unique'
    });
  });

  // Check for gaps and overlaps among regular periods only
  // (split segments overlap by design in lunch rotations)
  const regularPeriods = [];
  schedule.periods.forEach(period => {
    regularPeriods.push({
      name: period.name,
      startMin: parseTimeToMinutes(period.startTime),
      endMin: parseTimeToMinutes(period.endTime)
    });
  });

  const validPeriods = regularPeriods.filter(p => p.startMin !== null && p.endMin !== null);
  const sorted = [...validPeriods].sort((a, b) => a.startMin - b.startMin);

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const gap = next.startMin - cur.endMin;

    if (gap < 0) {
      issues.push({
        severity: 'warning',
        scheduleName,
        periodName: `${cur.name} & ${next.name}`,
        message: `Periods overlap by ${-gap} minutes`,
        suggestion: 'Adjust times to eliminate overlap'
      });
    } else if (gap > 30) {
      issues.push({
        severity: 'info',
        scheduleName,
        periodName: `${cur.name} - ${next.name}`,
        message: `Gap of ${gap} minutes between periods`,
        suggestion: 'This may be intentional (passing time, lunch, etc.)'
      });
    }
  }

  return issues;
}

function validateDocument(stateObj) {
  const issues = [];

  if (!stateObj.schedules || Object.keys(stateObj.schedules).length === 0) {
    issues.push({
      severity: 'error',
      scheduleName: '',
      periodName: '',
      message: 'At least one schedule is required',
      suggestion: 'Add a schedule in Step 1'
    });
    return { isValid: false, issues, summary: '1 error, 0 warnings, 0 info' };
  }

  Object.entries(stateObj.schedules).forEach(([scheduleName, schedule]) => {
    const scheduleIssues = validateSchedule(schedule, scheduleName);
    issues.push(...scheduleIssues);
  });

  // Cross-schedule consistency check (if multiple schedules)
  const scheduleNames = Object.keys(stateObj.schedules);
  if (scheduleNames.length > 1) {
    const firstScheduleNames = new Set(
      stateObj.schedules[scheduleNames[0]].periods.map(p => p.name).filter(n => n.trim() !== '')
    );
    scheduleNames.slice(1).forEach(sName => {
      const otherNames = new Set(
        stateObj.schedules[sName].periods.map(p => p.name).filter(n => n.trim() !== '')
      );
      if (firstScheduleNames.size > 0 && otherNames.size > 0) {
        const mismatch = [...firstScheduleNames].filter(n => !otherNames.has(n));
        if (mismatch.length > 0) {
          issues.push({
            severity: 'info',
            scheduleName: sName,
            periodName: '',
            message: `Schedule has different periods than "${scheduleNames[0]}"`,
            suggestion: 'Ensure period names match across schedules if intentional'
          });
        }
      }
    });
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const isValid = errorCount === 0;

  return {
    isValid,
    issues,
    summary: `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}, ${infoCount} info`
  };
}

// ============================================================================
// HLS Export
// ============================================================================

function buildHlsJson(stateObj) {
  const result = {};

  Object.entries(stateObj.schedules).forEach(([scheduleName, schedule]) => {
    const periods = [];

    // Collect parent names that have splits so we can replace them
    const splitParentNames = new Set(
      Object.values(schedule.splitPeriods || {}).map(s => s.parentName)
    );

    // Add regular periods (skip parents that are replaced by split segments)
    schedule.periods.forEach(period => {
      if (period.name && period.startTime && period.endTime && !splitParentNames.has(period.name)) {
        periods.push({
          period_name: period.name,
          start_time: period.startTime,
          end_time: period.endTime
        });
      }
    });

    // Add split period segments (replacing the parent)
    Object.entries(schedule.splitPeriods || {}).forEach(([_, split]) => {
      (split.segments || []).forEach(segment => {
        if (segment.masterName && segment.startTime && segment.endTime) {
          periods.push({
            period_name: segment.masterName,
            start_time: segment.startTime,
            end_time: segment.endTime
          });
        }
      });
    });

    // Sort by start_time
    periods.sort((a, b) => {
      const aMin = parseTimeToMinutes(a.start_time);
      const bMin = parseTimeToMinutes(b.start_time);
      return aMin - bMin;
    });

    result[scheduleName] = periods;
  });

  return result;
}

// ============================================================================
// DOM State Management
// ============================================================================

function readStateFromDOM() {
  state.schoolName = document.getElementById('school-name').value;
  state.scheduleType = document.querySelector('input[name="schedule-type"]:checked').value;
  state.hasLunchSplits = document.getElementById('lunch-splits-check').checked;

  // Read schedule names
  const newSchedules = {};
  document.querySelectorAll('.schedule-name-input').forEach(input => {
    const name = input.value.trim() || 'Unnamed';
    if (!newSchedules[name]) {
      newSchedules[name] = state.schedules[name] || {
        periods: [{ name: '', startTime: '', endTime: '' }],
        splitPeriods: {}
      };
    }
  });

  // If schedule names changed, update state
  Object.keys(state.schedules).forEach(name => {
    if (!newSchedules[name]) delete state.schedules[name];
  });
  Object.assign(state.schedules, newSchedules);

  // Read periods for the active schedule tab
  const activeSchedule = document.querySelector('#period-tabs .tab-btn.active')?.dataset.schedule;
  if (activeSchedule && state.schedules[activeSchedule]) {
    const periods = [];
    document.querySelectorAll('#periods-container .period-row').forEach(row => {
      const nameInput = row.querySelector('.period-name');
      const startInput = row.querySelector('.period-start');
      const endInput = row.querySelector('.period-end');
      periods.push({
        name: nameInput.value.trim(),
        startTime: startInput.value,
        endTime: endInput.value
      });
    });
    state.schedules[activeSchedule].periods = periods;
  }

  // Read split periods for active schedule (if Step 3)
  if (state.hasLunchSplits) {
    const activeSplitSchedule = document.querySelector('.split-tab-btn.active')?.dataset.schedule;
    if (activeSplitSchedule && state.schedules[activeSplitSchedule]) {
      const splitPeriods = {};
      document.querySelectorAll('.split-period-card').forEach(card => {
        const parentSelect = card.querySelector('.parent-period-select');
        const parentName = parentSelect?.value || '';
        const segments = [];
        card.querySelectorAll('.segment-row').forEach(row => {
          const parsedInput = row.querySelector('.segment-parsed-name');
          const masterInput = row.querySelector('.segment-master-name');
          const startInput = row.querySelector('.segment-start');
          const endInput = row.querySelector('.segment-end');
          segments.push({
            parsedName: parsedInput?.value || '',
            masterName: masterInput?.value || '',
            startTime: startInput?.value || '',
            endTime: endInput?.value || ''
          });
        });
        const classComboInput = card.querySelector('.class-combinations-input');
        const classCombinations = classComboInput?.value || '';

        if (parentName) {
          splitPeriods[parentName] = {
            parentName,
            segments,
            classCombinations
          };
        }
      });
      state.schedules[activeSplitSchedule].splitPeriods = splitPeriods;
    }
  }
}

// ============================================================================
// Step 1: Setup
// ============================================================================

function initStep1() {
  const schoolNameInput = document.getElementById('school-name');
  const lunchSplitsCheck = document.getElementById('lunch-splits-check');
  const addScheduleBtn = document.getElementById('btn-add-schedule');
  const step1ContinueBtn = document.getElementById('btn-step1-continue');
  const scheduleNamesContainer = document.getElementById('schedule-names-container');

  // Add schedule button
  addScheduleBtn.addEventListener('click', () => {
    const inputCount = scheduleNamesContainer.querySelectorAll('.schedule-name-input').length;
    if (inputCount >= 4) {
      alert('Maximum 4 schedules allowed');
      return;
    }
    const row = document.createElement('div');
    row.className = 'schedule-name-row';
    row.innerHTML = `
      <input type="text" class="schedule-name-input" placeholder="e.g., Block Day">
      <button class="btn btn-danger remove-schedule" style="padding: 0.4rem 0.7rem; font-size: 0.85rem;">Remove</button>
    `;
    scheduleNamesContainer.appendChild(row);
    updateRemoveButtons();

    row.querySelector('.remove-schedule').addEventListener('click', (e) => {
      e.preventDefault();
      row.remove();
      updateRemoveButtons();
    });
  });

  function updateRemoveButtons() {
    const rows = scheduleNamesContainer.querySelectorAll('.schedule-name-row');
    rows.forEach((row, i) => {
      const btn = row.querySelector('.remove-schedule');
      btn.style.display = rows.length > 1 ? 'block' : 'none';
    });
  }

  updateRemoveButtons();

  // Delegate remove button clicks
  scheduleNamesContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-schedule')) {
      e.preventDefault();
      e.target.closest('.schedule-name-row').remove();
      updateRemoveButtons();
    }
  });

  // Continue button
  step1ContinueBtn.addEventListener('click', () => {
    readStateFromDOM();
    const inputs = scheduleNamesContainer.querySelectorAll('.schedule-name-input');
    let hasValidName = false;
    inputs.forEach(input => {
      if (input.value.trim() !== '') hasValidName = true;
    });

    if (!hasValidName) {
      alert('Please enter at least one schedule name');
      return;
    }

    enableStep(2);
    initStep2();
  });

  // Update Step 3 visibility when lunch splits toggle
  lunchSplitsCheck.addEventListener('change', () => {
    readStateFromDOM();
  });
}

// ============================================================================
// Step 2: Period Editor
// ============================================================================

let currentScheduleStep2 = null;

function initStep2() {
  readStateFromDOM();
  renderPeriodTabs();
  renderPeriodRows();
  setupPeriodEventListeners();
}

function renderPeriodTabs() {
  const tabContainer = document.getElementById('period-tabs');
  tabContainer.innerHTML = '';
  Object.keys(state.schedules).forEach(scheduleName => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.schedule = scheduleName;
    if (!currentScheduleStep2) {
      btn.classList.add('active');
      currentScheduleStep2 = scheduleName;
    } else if (scheduleName === currentScheduleStep2) {
      btn.classList.add('active');
    }
    btn.textContent = scheduleName;
    btn.addEventListener('click', () => {
      readStateFromDOM();
      document.querySelectorAll('#period-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScheduleStep2 = scheduleName;
      renderPeriodRows();
      setupPeriodEventListeners();
    });
    tabContainer.appendChild(btn);
  });
}

function renderPeriodRows() {
  const container = document.getElementById('periods-container');
  container.innerHTML = '';

  if (!currentScheduleStep2 || !state.schedules[currentScheduleStep2]) return;

  const periods = state.schedules[currentScheduleStep2].periods;
  periods.forEach((period, idx) => {
    const row = document.createElement('div');
    row.className = 'period-row';
    row.innerHTML = `
      <input type="text" class="period-name" placeholder="Period 1" value="${period.name || ''}">
      <input type="time" class="period-start" value="${period.startTime || ''}">
      <input type="time" class="period-end" value="${period.endTime || ''}">
      <button class="btn btn-danger remove-period" style="padding: 0.35rem 0.5rem; min-width: auto;">x</button>
    `;
    container.appendChild(row);

    row.querySelector('.remove-period').addEventListener('click', (e) => {
      e.preventDefault();
      if (container.querySelectorAll('.period-row').length > 1) {
        row.remove();
        readStateFromDOM();
        renderPeriodRows();
        setupPeriodEventListeners();
      } else {
        alert('At least one period is required');
      }
    });
  });
}

function setupPeriodEventListeners() {
  const addBtn = document.getElementById('btn-add-period');
  const continueBtn = document.getElementById('btn-step2-continue');

  addBtn.onclick = () => {
    if (!currentScheduleStep2) return;
    readStateFromDOM();
    state.schedules[currentScheduleStep2].periods.push({
      name: '',
      startTime: '',
      endTime: ''
    });
    renderPeriodRows();
    setupPeriodEventListeners();
  };

  continueBtn.onclick = () => {
    readStateFromDOM();
    if (state.hasLunchSplits) {
      enableStep(3);
      initStep3();
    } else {
      enableStep(4);
      initStep4();
    }
  };
}

// ============================================================================
// Step 3: Split Periods
// ============================================================================

let currentScheduleStep3 = null;

function initStep3() {
  readStateFromDOM();
  renderSplitTabs();
  renderSplitPeriods();
}

function renderSplitTabs() {
  const tabContainer = document.getElementById('split-tabs');
  tabContainer.innerHTML = '';
  Object.keys(state.schedules).forEach(scheduleName => {
    const btn = document.createElement('button');
    btn.className = 'split-tab-btn tab-btn';
    btn.dataset.schedule = scheduleName;
    if (!currentScheduleStep3) {
      btn.classList.add('active');
      currentScheduleStep3 = scheduleName;
    } else if (scheduleName === currentScheduleStep3) {
      btn.classList.add('active');
    }
    btn.textContent = scheduleName;
    btn.addEventListener('click', () => {
      readStateFromDOM();
      document.querySelectorAll('#split-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScheduleStep3 = scheduleName;
      renderSplitPeriods();
    });
    tabContainer.appendChild(btn);
  });
}

function renderSplitPeriods() {
  const container = document.getElementById('split-periods-container');
  container.innerHTML = '';

  if (!currentScheduleStep3 || !state.schedules[currentScheduleStep3]) return;

  const schedule = state.schedules[currentScheduleStep3];
  const periodNames = schedule.periods.map(p => p.name).filter(n => n.trim() !== '');

  if (periodNames.length === 0) {
    container.innerHTML = '<div class="no-splits-message">No periods defined in Step 2 for this schedule.</div>';
    return;
  }

  const splitPeriods = schedule.splitPeriods || {};

  if (Object.keys(splitPeriods).length === 0) {
    container.innerHTML = '<div class="no-splits-message">No split periods configured for this schedule. Click "Add Split Period" to get started.</div>';
  }

  Object.entries(splitPeriods).forEach(([splitName, split]) => {
    const card = document.createElement('div');
    card.className = 'split-period-card';

    const header = document.createElement('div');
    header.className = 'split-period-header';
    header.innerHTML = `<h4>${splitName}</h4><button class="btn btn-danger remove-split-period" style="padding: 0.35rem 0.7rem; font-size: 0.85rem;">Remove</button>`;
    card.appendChild(header);

    header.querySelector('.remove-split-period').addEventListener('click', (e) => {
      e.preventDefault();
      delete schedule.splitPeriods[splitName];
      renderSplitPeriods();
    });

    // Parent period select
    const parentDiv = document.createElement('div');
    parentDiv.className = 'field';
    parentDiv.innerHTML = '<label>Parent Period</label>';
    const select = document.createElement('select');
    select.className = 'parent-period-select';
    periodNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === split.parentName) opt.selected = true;
      select.appendChild(opt);
    });
    parentDiv.appendChild(select);
    card.appendChild(parentDiv);

    // Segments
    const segmentsDiv = document.createElement('div');
    segmentsDiv.className = 'field';
    const segLabel = document.createElement('div');
    segLabel.innerHTML = '<strong style="font-size: 0.9rem;">Segments</strong>';
    segmentsDiv.appendChild(segLabel);

    const segmentRows = document.createElement('div');
    segmentRows.style.marginTop = '0.5rem';
    (split.segments || []).forEach((segment, idx) => {
      const row = document.createElement('div');
      row.className = 'segment-row';
      row.innerHTML = `
        <input type="text" class="segment-parsed-name" placeholder="Segment name" value="${segment.parsedName || ''}">
        <input type="text" class="segment-master-name" placeholder="Master name" value="${segment.masterName || ''}">
        <input type="time" class="segment-start" value="${segment.startTime || ''}">
        <input type="time" class="segment-end" value="${segment.endTime || ''}">
        <button class="btn btn-danger remove-segment" style="padding: 0.3rem 0.5rem; min-width: auto;">x</button>
      `;
      segmentRows.appendChild(row);

      row.querySelector('.remove-segment').addEventListener('click', (e) => {
        e.preventDefault();
        split.segments.splice(idx, 1);
        renderSplitPeriods();
      });
    });
    segmentsDiv.appendChild(segmentRows);
    card.appendChild(segmentsDiv);

    // Add segment button
    const addSegBtn = document.createElement('button');
    addSegBtn.className = 'btn btn-secondary';
    addSegBtn.textContent = 'Add Segment';
    addSegBtn.style.marginBottom = '1rem';
    addSegBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!split.segments) split.segments = [];
      split.segments.push({ parsedName: '', masterName: '', startTime: '', endTime: '' });
      renderSplitPeriods();
    });
    card.appendChild(addSegBtn);

    // Class combinations
    const classDiv = document.createElement('div');
    classDiv.className = 'field class-combinations-field';
    classDiv.innerHTML = `
      <label>Class Combinations</label>
      <input type="text" class="class-combinations-input" placeholder="3AB, 3BC, 3AC" value="${split.classCombinations || ''}">
    `;
    card.appendChild(classDiv);

    container.appendChild(card);
  });

  // Add split period button
  const addBtn = document.createElement('button');
  addBtn.id = 'btn-add-split-period';
  addBtn.className = 'btn btn-secondary';
  addBtn.textContent = 'Add Split Period';
  addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!schedule.splitPeriods) schedule.splitPeriods = {};
    const newSplitName = periodNames[0];
    if (!schedule.splitPeriods[newSplitName]) {
      schedule.splitPeriods[newSplitName] = {
        parentName: newSplitName,
        segments: [{ parsedName: '', masterName: '', startTime: '', endTime: '' }],
        classCombinations: ''
      };
    }
    renderSplitPeriods();
  });
  container.appendChild(addBtn);

  // Step 3 continue button
  const continueBtn = document.getElementById('btn-step3-continue');
  continueBtn.onclick = () => {
    readStateFromDOM();
    enableStep(4);
    initStep4();
  };
}

// ============================================================================
// Step 4: Validate & Export
// ============================================================================

function initStep4() {
  readStateFromDOM();
  const validateBtn = document.getElementById('btn-validate');
  const downloadBtn = document.getElementById('btn-download-json');
  const startOverBtn = document.getElementById('btn-start-over');

  validateBtn.onclick = () => {
    readStateFromDOM();
    const result = validateDocument(state);
    displayValidationResults(result);
    updateJsonPreview();
    downloadBtn.disabled = !result.isValid;
  };

  downloadBtn.onclick = () => {
    readStateFromDOM();
    const result = validateDocument(state);
    if (!result.isValid) {
      alert('Cannot download: there are validation errors');
      return;
    }
    const json = buildHlsJson(state);
    const filename = state.schoolName
      ? `${state.schoolName.toLowerCase().replace(/\s+/g, '_')}_bell_schedule.json`
      : 'bell_schedule.json';
    downloadJSON(json, filename);
  };

  startOverBtn.onclick = () => {
    location.reload();
  };
}

function displayValidationResults(result) {
  const resultsDiv = document.getElementById('validation-results');
  resultsDiv.innerHTML = `<div class="validation-summary">${result.summary}</div>`;

  result.issues.forEach(issue => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'validation-item';
    const iconDiv = document.createElement('div');
    iconDiv.className = `validation-icon ${issue.severity}`;
    iconDiv.textContent = issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '⚠' : 'ℹ';
    const textDiv = document.createElement('div');
    textDiv.className = 'validation-text';
    textDiv.innerHTML = `
      <strong>${issue.message}</strong>
      <span>${issue.scheduleName ? `Schedule: ${issue.scheduleName}` : ''} ${issue.periodName ? `Period: ${issue.periodName}` : ''}</span>
      <span>${issue.suggestion ? `💡 ${issue.suggestion}` : ''}</span>
    `;
    itemDiv.appendChild(iconDiv);
    itemDiv.appendChild(textDiv);
    resultsDiv.appendChild(itemDiv);
  });

  resultsDiv.classList.remove('hidden');
}

function updateJsonPreview() {
  readStateFromDOM();
  const json = buildHlsJson(state);
  const previewDiv = document.getElementById('json-preview');
  previewDiv.innerHTML = `<code>${JSON.stringify(json, null, 2)}</code>`;
}

function downloadJSON(obj, filename) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Step Management
// ============================================================================

function enableStep(stepNum) {
  const stepIds = ['step-setup', 'step-periods', 'step-splits', 'step-export'];
  stepIds.forEach((id, i) => {
    const step = document.getElementById(id);
    const stepIndex = i + 1; // 1-based
    if (stepIndex <= stepNum) {
      step.classList.remove('disabled');
    } else {
      step.classList.add('disabled');
    }
  });

  // Always hide Step 3 if no lunch splits
  if (!state.hasLunchSplits) {
    document.getElementById('step-splits').classList.add('disabled');
  }
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  enableStep(1);
  initStep1();
});
