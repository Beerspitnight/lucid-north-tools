// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0; // ensure uint32
  }

  random() {
    // Mulberry32 PRNG
    let x = this.seed += 0x6d2b79f5;
    x = Math.imul(x ^ (x >>> 15), 1 | x);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    this.seed = x ^ (x >>> 14);
    return (this.seed >>> 0) / 4294967296;
  }

  randint(min, max) {
    // Returns random integer in [min, max) range
    return Math.floor(this.random() * (max - min)) + min;
  }

  choice(arr) {
    // Returns random element from array
    if (arr.length === 0) return undefined;
    return arr[this.randint(0, arr.length)];
  }

  sample(arr, n) {
    // Returns n random distinct elements from array (Fisher-Yates shuffle)
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = this.randint(i, copy.length);
      [copy[i], copy[idx]] = [copy[idx], copy[i]];
      result.push(copy[i]);
    }
    return result;
  }
}

// ============================================================================
// HASH SEED FUNCTION
// ============================================================================

function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) >>> 0; // Ensure uint32
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEPARTMENTS = [
  "English/Language Arts",
  "Mathematics",
  "Science",
  "Social Studies",
  "World Languages",
  "Physical Education/Health",
  "Fine Arts",
  "Business/Technology"
];

const DEPT_SHORT = {
  "English/Language Arts": "ELA",
  "Mathematics": "MATH",
  "Science": "SCI",
  "Social Studies": "SS",
  "World Languages": "WL",
  "Physical Education/Health": "PE",
  "Fine Arts": "ART",
  "Business/Technology": "BUS"
};

const COURSES = {
  "English/Language Arts": [
    "English I", "English II", "English III", "English IV", "English V",
    "AP English Literature", "AP English Language", "Creative Writing",
    "Journalism", "Speech and Debate", "World Literature", "Freshman Seminar",
    "Advanced Composition"
  ],
  "Mathematics": [
    "Algebra I", "Algebra II", "Geometry", "Precalculus", "Calculus",
    "AP Calculus AB", "AP Calculus BC", "Statistics", "Linear Algebra",
    "AP Statistics", "College Algebra"
  ],
  "Science": [
    "Biology", "Chemistry", "Physics", "Earth Science", "Environmental Science",
    "AP Biology", "AP Chemistry", "AP Physics", "Anatomy and Physiology",
    "Marine Biology"
  ],
  "Social Studies": [
    "World History", "US History", "Government", "Economics", "Psychology",
    "Sociology", "AP World History", "AP US History", "AP Government",
    "AP Economics", "Global Issues", "History of Science"
  ],
  "World Languages": [
    "Spanish I", "Spanish II", "Spanish III", "Spanish IV", "Spanish V",
    "French I", "French II", "French III", "French IV", "German I",
    "German II", "Mandarin Chinese I"
  ],
  "Physical Education/Health": [
    "Physical Education", "Health", "Basketball", "Weight Training",
    "Volleyball", "Strength and Conditioning", "Sports Medicine",
    "Fitness and Wellness"
  ],
  "Fine Arts": [
    "Art I", "Art II", "Art III", "Photography", "Digital Art",
    "Music Theory", "Band", "Choir", "Drama", "Drawing and Painting"
  ],
  "Business/Technology": [
    "Business Fundamentals", "Accounting", "Marketing", "Finance",
    "Entrepreneurship", "Computer Science I", "Computer Science II",
    "Web Design", "Information Technology"
  ]
};

const ROOM_RANGES = {
  "English/Language Arts": "101-120",
  "Mathematics": "201-220",
  "Science": "301-320",
  "Social Studies": "401-420",
  "World Languages": "501-520",
  "Physical Education/Health": ["GYM A", "GYM B", "601-610"],
  "Fine Arts": "701-720",
  "Business/Technology": "801-820"
};

const TEACHER_POOL = [
  // Tier 1 (0-19)
  ["Anderson", "Sarah", "English/Language Arts"],
  ["Baker", "Michael", "English/Language Arts"],
  ["Chen", "Lisa", "English/Language Arts"],
  ["Ibrahim", "Ahmed", "Mathematics"],
  ["Johnson", "Karen", "Mathematics"],
  ["Klein", "David", "Mathematics"],
  ["Patterson", "Rachel", "Science"],
  ["Quinn", "Steven", "Science"],
  ["Roberts", "Emily", "Science"],
  ["Vasquez", "Diana", "Social Studies"],
  ["Williams", "Mark", "Social Studies"],
  ["Xavier", "Nicole", "Social Studies"],
  ["Bianchi", "Isabella", "World Languages"],
  ["Calderon", "Miguel", "World Languages"],
  ["Franklin", "Derek", "Physical Education/Health"],
  ["Gonzalez", "Maria", "Physical Education/Health"],
  ["Jackson", "Ryan", "Fine Arts"],
  ["Keller", "Stephanie", "Fine Arts"],
  ["Morgan", "Daniel", "Business/Technology"],
  ["Newman", "Rebecca", "Business/Technology"],
  // Tier 2 (20-39)
  ["Davis", "Robert", "English/Language Arts"],
  ["Evans", "Jennifer", "English/Language Arts"],
  ["Foster", "Thomas", "English/Language Arts"],
  ["Garcia", "Maria", "English/Language Arts"],
  ["Hughes", "Patricia", "English/Language Arts"],
  ["Lee", "Christine", "Mathematics"],
  ["Martinez", "Carlos", "Mathematics"],
  ["Nelson", "Amanda", "Mathematics"],
  ["O'Brien", "Patrick", "Mathematics"],
  ["Smith", "William", "Science"],
  ["Thompson", "Laura", "Science"],
  ["Underwood", "James", "Science"],
  ["Young", "Brian", "Social Studies"],
  ["Zimmerman", "Carol", "Social Studies"],
  ["Adams", "Gregory", "Social Studies"],
  ["Dubois", "Marie", "World Languages"],
  ["Esposito", "Lucia", "World Languages"],
  ["Harper", "James", "Physical Education/Health"],
  ["Irving", "Samantha", "Physical Education/Health"],
  ["Lambert", "Victoria", "Fine Arts"],
  // Tier 3 (40-79)
  ["Barrett", "Hannah", "English/Language Arts"],
  ["Crawford", "Jonathan", "English/Language Arts"],
  ["Dixon", "Michelle", "English/Language Arts"],
  ["Fitzgerald", "Andrew", "English/Language Arts"],
  ["Graham", "Laura", "English/Language Arts"],
  ["Hayes", "Peter", "Mathematics"],
  ["Ingram", "Natalie", "Mathematics"],
  ["Jensen", "Eric", "Mathematics"],
  ["Kramer", "Susan", "Mathematics"],
  ["Lynch", "Matthew", "Mathematics"],
  ["Monroe", "Katherine", "Science"],
  ["Nash", "Douglas", "Science"],
  ["Ortiz", "Angela", "Science"],
  ["Price", "Kenneth", "Science"],
  ["Reeves", "Stephanie", "Science"],
  ["Sanders", "Timothy", "Social Studies"],
  ["Taylor", "Melissa", "Social Studies"],
  ["Upton", "Charles", "Social Studies"],
  ["Vega", "Christina", "Social Studies"],
  ["Walsh", "Donald", "Social Studies"],
  ["Xu", "Patricia", "World Languages"],
  ["Yamamoto", "Kevin", "World Languages"],
  ["Zhao", "Linda", "World Languages"],
  ["Almeida", "Carlos", "World Languages"],
  ["Belanger", "Sophie", "World Languages"],
  ["Collins", "Derrick", "Physical Education/Health"],
  ["Dawson", "Katherine", "Physical Education/Health"],
  ["Ellis", "Marcus", "Physical Education/Health"],
  ["Fisher", "Nicole", "Physical Education/Health"],
  ["Grant", "Brandon", "Physical Education/Health"],
  ["Hoffman", "Danielle", "Fine Arts"],
  ["Jennings", "Paul", "Fine Arts"],
  ["Kendall", "Catherine", "Fine Arts"],
  ["Lawson", "Richard", "Fine Arts"],
  ["Mitchell", "Angela", "Fine Arts"],
  ["Norton", "Jeffrey", "Business/Technology"],
  ["Owens", "Patricia", "Business/Technology"],
  ["Palmer", "Gregory", "Business/Technology"],
  ["Quinlan", "Deborah", "Business/Technology"],
  ["Russo", "Anthony", "Business/Technology"],
  // Tier 4 (80-119)
  ["Shepard", "Caroline", "English/Language Arts"],
  ["Torres", "Benjamin", "English/Language Arts"],
  ["Underhill", "Jessica", "English/Language Arts"],
  ["Vernon", "Michael", "English/Language Arts"],
  ["Whitfield", "Sandra", "English/Language Arts"],
  ["York", "Diane", "Mathematics"],
  ["Ziegler", "Robert", "Mathematics"],
  ["Abbott", "Jennifer", "Mathematics"],
  ["Blackwell", "Thomas", "Mathematics"],
  ["Chang", "Helen", "Mathematics"],
  ["Donovan", "Keith", "Science"],
  ["Erikson", "Lisa", "Science"],
  ["Flores", "Gabriel", "Science"],
  ["Gibson", "Martha", "Science"],
  ["Holland", "Scott", "Science"],
  ["Irwin", "Rebecca", "Social Studies"],
  ["Jacobson", "Daniel", "Social Studies"],
  ["Kirby", "Sharon", "Social Studies"],
  ["Lester", "Raymond", "Social Studies"],
  ["McAllister", "Pamela", "Social Studies"],
  ["Nakamura", "David", "World Languages"],
  ["Osborne", "Theresa", "World Languages"],
  ["Petrov", "Alexander", "World Languages"],
  ["Quintero", "Maria", "World Languages"],
  ["Rosenberg", "Steven", "World Languages"],
  ["Sullivan", "Jason", "Physical Education/Health"],
  ["Thornton", "Amanda", "Physical Education/Health"],
  ["Urban", "Christopher", "Physical Education/Health"],
  ["Valdez", "Monica", "Physical Education/Health"],
  ["Wallace", "Bryan", "Physical Education/Health"],
  ["Xiong", "Nancy", "Fine Arts"],
  ["Yates", "Jeffrey", "Fine Arts"],
  ["Zimmermann", "Heidi", "Fine Arts"],
  ["Armstrong", "Phillip", "Fine Arts"],
  ["Bishop", "Carolyn", "Fine Arts"],
  ["Carpenter", "William", "Business/Technology"],
  ["Davenport", "Linda", "Business/Technology"],
  ["Emerson", "Craig", "Business/Technology"],
  ["Faulkner", "Joyce", "Business/Technology"],
  ["Garrison", "Keith", "Business/Technology"]
];

const SCHEDULE_TYPES = {
  no_rotation: { label: "No Rotation", cols: 8 },
  a_b_rotation: { label: "A/B Rotation", cols: 26 },
  ab_block_6: { label: "A/B Block (6-Period)", cols: 14 }
};

const TEACHER_COUNTS = [20, 40, 80, 120];

// ============================================================================
// ROOM GENERATION UTILITIES
// ============================================================================

function parseRoomRange(rangeSpec, rng) {
  if (Array.isArray(rangeSpec)) {
    // For PE: mix of room names and ranges
    const rooms = [];
    for (const spec of rangeSpec) {
      if (typeof spec === "string" && !spec.includes("-")) {
        rooms.push(spec);
      } else if (typeof spec === "string" && spec.includes("-")) {
        const [start, end] = spec.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          rooms.push(String(i));
        }
      }
    }
    return rooms;
  } else {
    // For ranges like "101-120"
    const [start, end] = rangeSpec.split("-").map(Number);
    const rooms = [];
    for (let i = start; i <= end; i++) {
      rooms.push(String(i));
    }
    return rooms;
  }
}

function getRandomRoom(dept, rng) {
  const rangeSpec = ROOM_RANGES[dept];
  const rooms = parseRoomRange(rangeSpec, rng);
  return rng.choice(rooms);
}

// ============================================================================
// SCHEDULE GENERATOR CLASS
// ============================================================================

class ScheduleGenerator {
  constructor() {
    this.lastScheduleType = null;
    this.lastTeacherCount = null;
  }

  generate(scheduleType, teacherCount) {
    const seed = hashSeed(`schedule_${scheduleType}_${teacherCount}`);
    const rng = new SeededRandom(seed);

    if (scheduleType === "no_rotation") {
      return this._genNoRotation(teacherCount, rng);
    } else if (scheduleType === "a_b_rotation") {
      return this._genAbRotation(teacherCount, rng);
    } else if (scheduleType === "ab_block_6") {
      return this._genAbBlock(teacherCount, rng);
    }

    return { headers: [], rows: [] };
  }

  generateCsv(scheduleType, teacherCount) {
    const data = this.generate(scheduleType, teacherCount);
    const lines = [];

    // Header row
    const headerRow = data.headers.map(h => this._escapeCsv(h)).join(",");
    lines.push(headerRow);

    // Data rows
    for (const row of data.rows) {
      const rowData = row.map(cell => this._escapeCsv(String(cell))).join(",");
      lines.push(rowData);
    }

    const csv = lines.join("\n");
    const label = SCHEDULE_TYPES[scheduleType].label;
    const filename = `schedule_${scheduleType}_${teacherCount}t.csv`;

    return { filename, csv };
  }

  generatePreview(scheduleType, teacherCount, maxRows = 20) {
    const data = this.generate(scheduleType, teacherCount);
    const totalRows = data.rows.length;
    const totalCols = data.headers.length;
    const previewRows = data.rows.slice(0, maxRows);

    // Count departments
    const deptCounts = {};
    for (const dept of DEPARTMENTS) {
      deptCounts[dept] = 0;
    }
    for (const row of data.rows) {
      const dept = row[0];
      if (deptCounts.hasOwnProperty(dept)) {
        deptCounts[dept]++;
      }
    }

    const departments = Object.entries(deptCounts).map(([dept, count]) => ({
      name: dept,
      count: count,
      short: DEPT_SHORT[dept]
    }));

    const label = SCHEDULE_TYPES[scheduleType].label;
    const filename = `schedule_${scheduleType}_${teacherCount}t.csv`;

    return {
      headers: data.headers,
      rows: data.rows,
      totalRows,
      totalCols,
      previewRows,
      departments,
      filename
    };
  }

  _genNoRotation(tc, rng) {
    const headers = ["Department", "Teacher", "Period 1", "Period 2", "Period 3A", "Period 3B", "Period 3C", "Period 4"];

    // Get and sort teachers
    const teachers = TEACHER_POOL.slice(0, tc);
    teachers.sort((a, b) => {
      const deptA = DEPARTMENTS.indexOf(a[2]);
      const deptB = DEPARTMENTS.indexOf(b[2]);
      if (deptA !== deptB) return deptA - deptB;
      return a[0].localeCompare(b[0]); // Sort by last name
    });

    const rows = [];
    const p3LunchRotation = ["3A", "3B", "3C"];
    let p3LunchIdx = 0;

    // ~12% get P3 Prep pattern
    const p3PrepCount = Math.ceil(tc * 0.12);
    const p3PrepIndices = new Set(rng.sample(Array.from({ length: tc }, (_, i) => i), p3PrepCount));

    for (let i = 0; i < teachers.length; i++) {
      const [lastName, firstName, dept] = teachers[i];
      const row = [dept, `${lastName}, ${firstName}`];

      if (p3PrepIndices.has(i)) {
        // P3 Prep pattern: all P3 slots are Prep
        const course = rng.choice(COURSES[dept]);
        const room = getRandomRoom(dept, rng);
        row.push(`${course} (Room: ${room})`); // P1
        row.push(`${course} (Room: ${room})`); // P2
        row.push("Prep"); // P3A
        row.push("Prep"); // P3B
        row.push("Prep"); // P3C
        row.push(`${course} (Room: ${room})`); // P4
      } else {
        // Standard pattern: 1 lunch in P3, 1 Prep in P1/P2/P4, 4 teaching
        const courses = rng.sample(COURSES[dept], 4);
        const rooms = courses.map(() => getRandomRoom(dept, rng));

        const lunchSlot = p3LunchRotation[p3LunchIdx % 3];
        p3LunchIdx++;

        const prepSlot = rng.choice(["P1", "P2", "P4"]);

        const periods = ["Period 1", "Period 2", "Period 3A", "Period 3B", "Period 3C", "Period 4"];
        const periodKeys = ["P1", "P2", "3A", "3B", "3C", "P4"];

        let courseIdx = 0;
        for (let p = 0; p < periods.length; p++) {
          const key = periodKeys[p];
          if (key === prepSlot) {
            row.push("Prep");
          } else if (key === `3${lunchSlot.charAt(1)}`) {
            row.push("Lunch");
          } else {
            const course = courses[courseIdx];
            const room = rooms[courseIdx];
            row.push(`${course} (Room: ${room})`);
            courseIdx++;
          }
        }
      }

      rows.push(row);
    }

    return { headers, rows };
  }

  _genAbRotation(tc, rng) {
    const periodPairs = ["1", "2", "3A", "3BC", "3B", "3AB", "3C", "4", "5", "6", "7", "8"];
    const headers = ["Department", "Teacher"];
    for (const period of periodPairs) {
      headers.push(`Period ${period} A Day`);
      headers.push(`Period ${period} B Day`);
    }

    // Get and sort teachers
    const teachers = TEACHER_POOL.slice(0, tc);
    teachers.sort((a, b) => {
      const deptA = DEPARTMENTS.indexOf(a[2]);
      const deptB = DEPARTMENTS.indexOf(b[2]);
      if (deptA !== deptB) return deptA - deptB;
      return a[0].localeCompare(b[0]);
    });

    const rows = [];
    const courseWeights = [5, 5, 2, 2, 2, 2, 2, 5, 1, 1, 1, 1];

    for (const [lastName, firstName, dept] of teachers) {
      const row = [dept, `${lastName}, ${firstName}`];

      // Weighted selection to get 5-7 courses
      const courseIndices = rng.sample(
        Array.from({ length: courseWeights.length }, (_, i) => i),
        courseWeights.length
      ).slice(0, rng.randint(5, 8));

      const courses = courseIndices.map(idx => rng.choice(COURSES[dept]));

      for (let p = 0; p < periodPairs.length; p++) {
        // 3-5 teaching slots per day, rest Prep
        const teachingCount = rng.randint(3, 6);
        const teachingIndices = new Set(rng.sample(
          Array.from({ length: courses.length }, (_, i) => i),
          Math.min(teachingCount, courses.length)
        ));

        // A Day
        let aDay = "Prep";
        if (teachingIndices.size > 0) {
          const idx = rng.choice(Array.from(teachingIndices));
          const course = courses[idx];
          const room = getRandomRoom(dept, rng);
          aDay = `${course} (Room: ${room})`;
        }
        row.push(aDay);

        // B Day: 70% chance same room as A day
        let bDay = "Prep";
        if (teachingIndices.size > 0) {
          const idx = rng.choice(Array.from(teachingIndices));
          const course = courses[idx];
          let room;
          if (rng.random() < 0.7 && aDay !== "Prep") {
            // Extract room from aDay if possible
            const match = aDay.match(/Room: (\w+)/);
            room = match ? match[1] : getRandomRoom(dept, rng);
          } else {
            room = getRandomRoom(dept, rng);
          }
          bDay = `${course} (Room: ${room})`;
        }
        row.push(bDay);
      }

      rows.push(row);
    }

    return { headers, rows };
  }

  _genAbBlock(tc, rng) {
    const headers = ["Department", "Teacher"];
    for (let p = 1; p <= 6; p++) {
      headers.push(`Period ${p} Day 1`);
      headers.push(`Period ${p} Day 2`);
    }

    // Get and sort teachers
    const teachers = TEACHER_POOL.slice(0, tc);
    teachers.sort((a, b) => {
      const deptA = DEPARTMENTS.indexOf(a[2]);
      const deptB = DEPARTMENTS.indexOf(b[2]);
      if (deptA !== deptB) return deptA - deptB;
      return a[0].localeCompare(b[0]);
    });

    const rows = [];

    for (const [lastName, firstName, dept] of teachers) {
      const row = [dept, `${lastName}, ${firstName}`];

      // 3-4 courses per teacher
      const courseCount = rng.randint(3, 5);
      const courses = rng.sample(COURSES[dept], courseCount);
      const rooms = courses.map(() => {
        if (rng.random() < 0.7 && courses.length > 0) {
          return getRandomRoom(dept, rng);
        }
        return getRandomRoom(dept, rng);
      });

      for (let p = 1; p <= 6; p++) {
        let day1, day2;

        if (p === 3 || p === 4) {
          // P3/P4: split Lunch/Activity
          const isEven = row.length % 2 === 0;
          if (isEven) {
            day1 = "Lunch";
            day2 = "Activity";
          } else {
            day1 = "Activity";
            day2 = "Lunch";
          }
        } else {
          // P1/P2/P5/P6: one Prep per day, rest teaching
          const hasPrep1 = rng.random() < 0.25;
          const hasPrep2 = rng.random() < 0.25;

          if (hasPrep1) {
            day1 = "Prep";
          } else {
            const courseIdx = rng.randint(0, courses.length);
            const course = courses[courseIdx];
            const room = rooms[courseIdx];
            day1 = `${course} (Room: ${room})`;
          }

          if (hasPrep2) {
            day2 = "Prep";
          } else {
            const courseIdx = rng.randint(0, courses.length);
            const course = courses[courseIdx];
            const room = rooms[courseIdx];
            day2 = `${course} (Room: ${room})`;
          }
        }

        row.push(day1);
        row.push(day2);
      }

      rows.push(row);
    }

    return { headers, rows };
  }

  _escapeCsv(str) {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
}

// ============================================================================
// UI LOGIC
// ============================================================================

let generator = null;

function initializeUI() {
  generator = new ScheduleGenerator();

  // DOM references
  const scheduleTypeSelect = document.getElementById("schedule-type");
  const teacherCountSelect = document.getElementById("teacher-count");
  const generateBtn = document.getElementById("btn-generate");
  const downloadBtn = document.getElementById("btn-download");
  const regenerateBtn = document.getElementById("btn-regenerate");

  // Populate dropdowns
  for (const [key, config] of Object.entries(SCHEDULE_TYPES)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.label;
    scheduleTypeSelect.appendChild(option);
  }

  for (const count of TEACHER_COUNTS) {
    const option = document.createElement("option");
    option.value = count;
    option.textContent = `${count} Teachers`;
    teacherCountSelect.appendChild(option);
  }

  // Event listeners
  generateBtn.addEventListener("click", doGenerate);
  downloadBtn.addEventListener("click", doDownload);
  regenerateBtn.addEventListener("click", doGenerate);
}

function doGenerate() {
  const scheduleTypeSelect = document.getElementById("schedule-type");
  const teacherCountSelect = document.getElementById("teacher-count");
  const stepPreview = document.getElementById("step-preview");
  const previewBody = document.getElementById("preview-body");
  const truncationNote = document.getElementById("truncation-note");
  const downloadBtn = document.getElementById("btn-download");
  const regenerateBtn = document.getElementById("btn-regenerate");

  const scheduleType = scheduleTypeSelect.value;
  const teacherCount = parseInt(teacherCountSelect.value, 10);

  const preview = generator.generatePreview(scheduleType, teacherCount, 20);

  // Update stats
  document.getElementById("stat-total-teachers").textContent = preview.totalRows;
  document.getElementById("stat-total-periods").textContent = preview.totalCols - 2;
  document.getElementById("stat-total-cells").textContent = preview.totalRows * (preview.totalCols - 2);

  // Update department badges
  const deptBadges = document.getElementById("dept-badges");
  deptBadges.innerHTML = "";
  for (const dept of preview.departments) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${dept.short}: ${dept.count}`;
    deptBadges.appendChild(badge);
  }

  // Populate table
  const previewHead = document.getElementById("preview-head");
  previewHead.innerHTML = "";
  const headerRow = document.createElement("tr");
  for (const header of preview.headers) {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  }
  previewHead.appendChild(headerRow);

  previewBody.innerHTML = "";
  for (const row of preview.previewRows) {
    const tr = document.createElement("tr");
    for (let i = 0; i < row.length; i++) {
      const td = document.createElement("td");
      const cellText = String(row[i]);
      td.textContent = cellText;

      // Apply highlighting
      if (cellText === "Prep") {
        td.classList.add("cell-prep");
      } else if (cellText.includes("Lunch")) {
        td.classList.add("cell-lunch");
      } else if (cellText.includes("Activity")) {
        td.classList.add("cell-activity");
      }

      tr.appendChild(td);
    }
    previewBody.appendChild(tr);
  }

  // Show truncation note if needed
  if (preview.totalRows > 20) {
    truncationNote.style.display = "block";
    truncationNote.textContent = `Showing first 20 of ${preview.totalRows} teachers`;
  } else {
    truncationNote.style.display = "none";
  }

  // Enable preview section and download button
  stepPreview.style.display = "block";
  downloadBtn.style.display = "inline-block";
  regenerateBtn.style.display = "inline-block";

  // Store for download
  window.currentSchedule = {
    scheduleType,
    teacherCount
  };
}

function doDownload() {
  if (!window.currentSchedule) return;

  const { scheduleType, teacherCount } = window.currentSchedule;
  const { filename, csv } = generator.generateCsv(scheduleType, teacherCount);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initialize UI when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUI);
} else {
  initializeUI();
}
