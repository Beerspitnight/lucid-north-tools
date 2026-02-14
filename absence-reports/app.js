// Absence Report Generator — fully client-side
// Uses jsPDF + jsPDF-AutoTable for PDF generation

// ============================================================================
// CONSTANTS
// ============================================================================

const SUBS = [
  ["Chloe Bennett", "(555) 101-2001"],
  ["Hannah Rodriguez", "(555) 102-2002"],
  ["Natalie Chen", "(555) 103-2003"],
  ["Zoe Hayes", "(555) 104-2004"],
  ["Grace Patterson", "(555) 105-2005"],
  ["Savannah Flores", "(555) 106-2006"],
  ["Layla Morgan", "(555) 107-2007"],
  ["Stella Kim", "(555) 108-2008"],
  ["Aubrey Wallace", "(555) 109-2009"],
  ["Penelope Rhodes", "(555) 110-2010"],
  ["Eleanor Sullivan", "(555) 111-2011"],
  ["Maya Fitzgerald", "(555) 112-2012"],
  ["Claire Dawson", "(555) 113-2013"],
  ["Sadie Gallagher", "(555) 114-2014"],
  ["Violet Lawson", "(555) 115-2015"],
  ["Naomi Bauer", "(555) 116-2016"],
  ["Elena Rivera", "(555) 117-2017"],
  ["Isabelle Chu", "(555) 118-2018"],
  ["Caleb Murphy", "(555) 119-2019"],
  ["Gavin Holt", "(555) 120-2020"],
  ["Jordan Beck", "(555) 121-2021"],
  ["Nathaniel Pierce", "(555) 122-2022"],
  ["Wesley Jennings", "(555) 123-2023"],
  ["Miles O'Donnell", "(555) 124-2024"],
];

const REASONS = [
  "Sick Day",
  "Family Illness",
  "Personal Day",
  "Professional Day",
  "Medical Appointment",
];

const DURATION_MAP = {
  "Full Day": "7:00 - 2:20",
  "Half Day AM": "7:00 - 11:15",
  "Half Day PM": "11:15 - 2:20",
};

const STATUSES = ["Approved", "No Appr. Req."];

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (values[j] || "").trim();
      }
      rows.push(row);
    }
  }
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseTeacherRoster(csvText) {
  const { rows } = parseCSV(csvText);
  const teachers = [];
  const deptCounts = {};

  for (const row of rows) {
    const name = (row["Teacher"] || "").trim();
    let dept = (row["Department"] || "").trim();
    if (!name) continue;
    if (!dept || dept === "nan") dept = "General";

    teachers.push([name, dept]);
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }

  return { teachers, teacherCount: teachers.length, departments: deptCounts };
}

// ============================================================================
// RANDOM HELPERS
// ============================================================================

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = randInt(i, copy.length);
    [copy[i], copy[idx]] = [copy[idx], copy[i]];
    result.push(copy[i]);
  }
  return result;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ============================================================================
// ABSENCE GENERATION
// ============================================================================

function generateConfNumber() {
  return String(randInt(680000000, 700000000));
}

function generateConfDatetime(reportDate) {
  const daysBefore = randInt(1, 6);
  const confDate = new Date(reportDate);
  confDate.setDate(confDate.getDate() - daysBefore);

  const hour = randInt(5, 23);
  const minute = randInt(0, 60);
  const amPm = hour < 12 ? "AM" : "PM";
  let displayHour = hour > 12 ? hour - 12 : hour;
  if (displayHour === 0) displayHour = 12;

  const dateStr = `${String(confDate.getMonth() + 1).padStart(2, "0")}/${String(confDate.getDate()).padStart(2, "0")}/${confDate.getFullYear()}`;
  const timeStr = `${displayHour}:${String(minute).padStart(2, "0")} ${amPm}`;

  return { confDate: dateStr, confTime: timeStr };
}

function generateAbsences(teachers, numAbsences, numSubs, durationTypes, reportDate) {
  if (!durationTypes || durationTypes.length === 0) {
    durationTypes = Object.keys(DURATION_MAP);
  }

  const durations = durationTypes
    .filter(dt => DURATION_MAP[dt])
    .map(dt => [dt, DURATION_MAP[dt]]);

  if (durations.length === 0) {
    for (const [k, v] of Object.entries(DURATION_MAP)) {
      durations.push([k, v]);
    }
  }

  numAbsences = Math.min(numAbsences, teachers.length);
  const absentTeachers = sample(teachers, numAbsences);

  const numFilled = Math.min(numSubs, numAbsences);
  const numUnfilled = numAbsences - numFilled;

  const shuffled = shuffle(absentTeachers);
  const unfilledTeachers = shuffled.slice(0, numUnfilled);
  const filledTeachers = shuffled.slice(numUnfilled);

  const availableSubs = sample(SUBS, Math.min(numFilled, SUBS.length));

  const absences = [];

  for (const teacher of unfilledTeachers) {
    const { confDate, confTime } = generateConfDatetime(reportDate);
    const dur = choice(durations);
    absences.push({
      type: "unfilled",
      conf_num: generateConfNumber(),
      conf_date: confDate,
      conf_time: confTime,
      name: teacher[0],
      department: teacher[1],
      duration: dur[0],
      shift: dur[1],
      reason: choice(REASONS),
      status: choice(STATUSES),
      substitute: null,
      sub_phone: null,
    });
  }

  for (let i = 0; i < filledTeachers.length; i++) {
    const teacher = filledTeachers[i];
    const { confDate, confTime } = generateConfDatetime(reportDate);
    const dur = choice(durations);
    const sub = i < availableSubs.length ? availableSubs[i] : choice(SUBS);
    absences.push({
      type: "filled",
      conf_num: generateConfNumber(),
      conf_date: confDate,
      conf_time: confTime,
      name: teacher[0],
      department: teacher[1],
      duration: dur[0],
      shift: dur[1],
      reason: choice(REASONS),
      status: choice(STATUSES),
      substitute: sub[0],
      sub_phone: sub[1],
    });
  }

  return absences;
}

// ============================================================================
// PDF GENERATION (jsPDF + AutoTable)
// ============================================================================

function createPdfReport(reportDate, absences) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Date formatting
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const dayName = dayNames[reportDate.getDay()];
  const formattedDate = `${dayName}, ${monthNames[reportDate.getMonth()]} ${reportDate.getDate()}, ${reportDate.getFullYear()}`;
  const shortDate = `${monthShort[reportDate.getMonth()]}. ${reportDate.getDate()}, ${reportDate.getFullYear()}`;
  const mm = String(reportDate.getMonth() + 1).padStart(2, "0");
  const dd = String(reportDate.getDate()).padStart(2, "0");
  const yy = String(reportDate.getFullYear()).slice(2);
  const timestamp = `${mm}/${dd}/${yy}, 12:00 AM`;

  // Header
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(timestamp, 36, 30);

  doc.setFontSize(22);
  doc.setTextColor(30);
  doc.text("Daily Report", 36, 58);

  // Filter info table
  const filterData = [
    ["Filter Report:", formattedDate, `Report Date: ${shortDate}`],
    ["Type:", "Absences and Vacancies", "Username: Brian McManus"],
    ["School(s):", "All Schools", ""],
    ["Employee Type(s):", "All Employee Types", ""],
  ];

  doc.autoTable({
    startY: 68,
    body: filterData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { textColor: [150, 150, 150], cellWidth: 100 },
      1: { cellWidth: 220 },
      2: { cellWidth: 180 },
    },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.5,
    margin: { left: 36 },
  });

  let yPos = doc.lastAutoTable.finalY + 20;

  // Split absences
  const unfilled = absences.filter(a => a.type === "unfilled");
  const filled = absences.filter(a => a.type === "filled");

  // Unfilled section
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text(`${unfilled.length}  Unfilled`, 36, yPos);
  yPos += 8;

  if (unfilled.length > 0) {
    const unfilledHead = [["Conf #", "School", "Name", "Employee Type", "Shift", "Duration", "Reason", "Status"]];
    const unfilledBody = unfilled.map(a => [
      `Absence\n${a.conf_num}\n${a.conf_date}\n${a.conf_time}`,
      "SBHS",
      `${a.name}\n${a.department}`,
      "Teacher",
      `Employee Times\n${a.shift}`,
      a.duration,
      a.reason,
      a.status,
    ]);

    doc.autoTable({
      startY: yPos,
      head: unfilledHead,
      body: unfilledBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 4, valign: "top", lineColor: [220, 220, 220], lineWidth: 0.5 },
      headStyles: { fillColor: [242, 242, 242], textColor: [30, 30, 30], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 42 },
        2: { cellWidth: 90 },
        3: { cellWidth: 60 },
        4: { cellWidth: 75 },
        5: { cellWidth: 60 },
        6: { cellWidth: 70 },
        7: { cellWidth: 55 },
      },
      margin: { left: 36 },
    });

    yPos = doc.lastAutoTable.finalY + 20;
  } else {
    yPos += 15;
  }

  // Filled section
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text(`${filled.length}  Filled`, 36, yPos);
  yPos += 8;

  if (filled.length > 0) {
    const filledHead = [["Conf #", "School", "Name", "Employee Type", "Shift", "Duration", "Reason", "Status", "Substitute"]];
    const filledBody = filled.map(a => [
      `Absence\n${a.conf_num}\n${a.conf_date}\n${a.conf_time}`,
      "SBHS",
      `${a.name}\n${a.department}`,
      "Teacher",
      `Employee Times\n${a.shift}`,
      a.duration,
      a.reason,
      a.status,
      `${a.substitute}\nPhone:\n${a.sub_phone}`,
    ]);

    doc.autoTable({
      startY: yPos,
      head: filledHead,
      body: filledBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 4, valign: "top", lineColor: [220, 220, 220], lineWidth: 0.5 },
      headStyles: { fillColor: [242, 242, 242], textColor: [30, 30, 30], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 38 },
        2: { cellWidth: 82 },
        3: { cellWidth: 55 },
        4: { cellWidth: 70 },
        5: { cellWidth: 55 },
        6: { cellWidth: 62 },
        7: { cellWidth: 50 },
        8: { cellWidth: 72, textColor: [40, 150, 40] },
      },
      didParseCell: function (data) {
        // Color the status column green for filled
        if (data.section === "body" && data.column.index === 7) {
          data.cell.styles.textColor = [40, 150, 40];
        }
      },
      margin: { left: 36 },
    });
  }

  return doc;
}

// ============================================================================
// UI LOGIC
// ============================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let roster = null;
let lastAbsences = null;

function init() {
  const csvInput = $("#csv-file");
  const btnUpload = $("#btn-upload");
  const reportDate = $("#report-date");
  const numAbsences = $("#num-absences");
  const numSubs = $("#num-subs");

  // Default date to today
  reportDate.value = new Date().toISOString().split("T")[0];

  // Enable upload when file selected
  csvInput.addEventListener("change", () => {
    btnUpload.disabled = !csvInput.files.length;
  });

  // Slider value displays
  numAbsences.addEventListener("input", () => {
    $("#absences-val").textContent = numAbsences.value;
  });
  numSubs.addEventListener("input", () => {
    $("#subs-val").textContent = numSubs.value;
  });

  // Upload handler
  btnUpload.addEventListener("click", () => {
    const file = csvInput.files[0];
    if (!file) return;

    btnUpload.disabled = true;
    btnUpload.textContent = "Reading\u2026";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        roster = parseTeacherRoster(e.target.result);

        if (roster.teacherCount === 0) {
          alert("No teachers found. Make sure the CSV has 'Teacher' and 'Department' columns.");
          return;
        }

        // Show summary
        $("#teacher-count").textContent = roster.teacherCount;
        const deptList = $("#dept-list");
        deptList.innerHTML = "";
        for (const [dept, count] of Object.entries(roster.departments)) {
          const tag = document.createElement("span");
          tag.className = "dept-tag";
          tag.textContent = `${dept} (${count})`;
          deptList.appendChild(tag);
        }
        $("#upload-summary").classList.remove("hidden");

        // Adjust slider max
        numAbsences.max = roster.teacherCount;
        if (parseInt(numAbsences.value) > roster.teacherCount) {
          numAbsences.value = Math.min(8, roster.teacherCount);
          $("#absences-val").textContent = numAbsences.value;
        }

        // Enable Step 2
        $("#step-config").classList.remove("disabled");
      } catch (err) {
        alert("Failed to parse CSV: " + err.message);
      } finally {
        btnUpload.disabled = false;
        btnUpload.textContent = "Upload";
      }
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      btnUpload.disabled = false;
      btnUpload.textContent = "Upload";
    };
    reader.readAsText(file);
  });

  // Generate handler
  function doGenerate() {
    if (!roster) return;

    const durations = Array.from($$('input[name="duration"]:checked')).map(cb => cb.value);
    if (!durations.length) {
      alert("Select at least one duration type.");
      return;
    }

    const btnGen = $("#btn-generate");
    btnGen.disabled = true;
    btnGen.textContent = "Generating\u2026";

    try {
      const dateVal = reportDate.value;
      const parts = dateVal.split("-");
      const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      lastAbsences = generateAbsences(
        roster.teachers,
        parseInt(numAbsences.value),
        parseInt(numSubs.value),
        durations,
        rDate
      );

      const unfilled = lastAbsences.filter(a => a.type === "unfilled");
      const filled = lastAbsences.filter(a => a.type === "filled");

      // Stats
      $("#stat-total").textContent = lastAbsences.length;
      $("#stat-unfilled").textContent = unfilled.length;
      $("#stat-filled").textContent = filled.length;

      // Unfilled table
      const tblUnfilled = $("#tbl-unfilled tbody");
      tblUnfilled.innerHTML = "";
      for (const a of unfilled) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          `<td>${a.conf_num}</td>` +
          `<td>${a.name}</td>` +
          `<td>${a.department}</td>` +
          `<td>${a.duration}</td>` +
          `<td>${a.reason}</td>` +
          `<td>${a.status}</td>`;
        tblUnfilled.appendChild(tr);
      }

      // Filled table
      const tblFilled = $("#tbl-filled tbody");
      tblFilled.innerHTML = "";
      for (const a of filled) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          `<td>${a.conf_num}</td>` +
          `<td>${a.name}</td>` +
          `<td>${a.department}</td>` +
          `<td>${a.duration}</td>` +
          `<td>${a.reason}</td>` +
          `<td>${a.status}</td>` +
          `<td class="sub-cell">${a.substitute}<br>${a.sub_phone}</td>`;
        tblFilled.appendChild(tr);
      }

      // Enable Step 3
      $("#step-review").classList.remove("disabled");
    } catch (err) {
      alert("Generation failed: " + err.message);
    } finally {
      btnGen.disabled = false;
      btnGen.textContent = "Generate Report";
    }
  }

  $("#btn-generate").addEventListener("click", doGenerate);
  $("#btn-regenerate").addEventListener("click", doGenerate);

  // Download PDF handler
  $("#btn-download").addEventListener("click", () => {
    if (!lastAbsences) return;

    const dateVal = reportDate.value;
    const parts = dateVal.split("-");
    const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

    const doc = createPdfReport(rDate, lastAbsences);
    doc.save(`absence_report_${dateVal.replace(/-/g, "")}.pdf`);
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
