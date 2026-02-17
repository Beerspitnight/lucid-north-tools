// State management
const state = {
    schedules: [],      // manifest data
    activeTag: 'All',   // current filter
    cache: {}           // fetched individual files
};

// Load manifest on page load
document.addEventListener('DOMContentLoaded', loadManifest);

/**
 * Load manifest.json and initialize UI
 */
async function loadManifest() {
    try {
        const response = await fetch('data/manifest.json');
        if (!response.ok) throw new Error('Failed to load manifest');
        state.schedules = await response.json();
        renderFilterBar();
        renderCards();
    } catch (error) {
        console.error('Error loading manifest:', error);
        const cardGrid = document.getElementById('card-grid');
        cardGrid.innerHTML = '<div class="col-span-full text-center text-slate-600">Failed to load schedule library.</div>';
    }
}

/**
 * Extract unique tags from all schedules
 */
function getAllUniqueTags() {
    const tagsSet = new Set();
    state.schedules.forEach(schedule => {
        if (Array.isArray(schedule.tags)) {
            schedule.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    return Array.from(tagsSet).sort();
}

/**
 * Render filter bar with pill buttons
 */
function renderFilterBar() {
    const filterBar = document.getElementById('filter-bar');
    filterBar.innerHTML = '';

    const allTags = getAllUniqueTags();
    const allButton = document.createElement('button');
    allButton.className = `filter-pill ${state.activeTag === 'All' ? 'active' : ''}`;
    allButton.textContent = 'All';
    allButton.addEventListener('click', () => {
        state.activeTag = 'All';
        updateFilterUI();
        renderCards();
    });
    filterBar.appendChild(allButton);

    allTags.forEach(tag => {
        const button = document.createElement('button');
        button.className = `filter-pill ${state.activeTag === tag ? 'active' : ''}`;
        button.textContent = tag;
        button.addEventListener('click', () => {
            state.activeTag = tag;
            updateFilterUI();
            renderCards();
        });
        filterBar.appendChild(button);
    });
}

/**
 * Update active state of filter pills
 */
function updateFilterUI() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.remove('active');
        if (pill.textContent === state.activeTag || (state.activeTag === 'All' && pill.textContent === 'All')) {
            pill.classList.add('active');
        }
    });
}

/**
 * Get filtered schedules based on active tag
 */
function getFilteredSchedules() {
    if (state.activeTag === 'All') {
        return state.schedules;
    }
    return state.schedules.filter(schedule =>
        Array.isArray(schedule.tags) && schedule.tags.includes(state.activeTag)
    );
}

/**
 * Render card grid with schedule cards
 */
function renderCards() {
    const cardGrid = document.getElementById('card-grid');
    const filteredSchedules = getFilteredSchedules();

    if (filteredSchedules.length === 0) {
        cardGrid.innerHTML = '<div class="col-span-full text-center text-slate-600">No schedules found for this filter.</div>';
        return;
    }

    cardGrid.innerHTML = filteredSchedules.map(schedule => `
        <div class="card border-l-4 border-hl-orange p-8 fade-in-up">
            <div class="flex items-start gap-4 mb-4">
                <div class="icon-container">
                    <svg class="w-6 h-6 text-hl-orange" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-navy">${escapeHtml(schedule.school_name)}</h3>
                    <p class="text-sm text-slate-500">${escapeHtml(schedule.location)}</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-4">
                ${(Array.isArray(schedule.tags) ? schedule.tags : [])
                    .map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
                    .join('')
                }
            </div>
            <details class="mb-4">
                <summary class="details-summary">Preview Schedule</summary>
                <div class="details-content" id="preview-${schedule.id}">
                    <p class="text-sm text-slate-400">Loading...</p>
                </div>
            </details>
            <button class="btn-primary w-full cursor-pointer" data-file="${schedule.file}" data-name="${escapeHtml(schedule.school_name)}">
                Download JSON
            </button>
        </div>
    `).join('');

    // Attach event listeners
    attachCardEventListeners();
}

/**
 * Attach event listeners to card buttons and details
 */
function attachCardEventListeners() {
    // Download buttons
    document.querySelectorAll('.btn-primary[data-file]').forEach(btn => {
        btn.addEventListener('click', () => {
            const file = btn.getAttribute('data-file');
            const name = btn.getAttribute('data-name');
            downloadSchedule(file, name);
        });
    });

    // Details toggle
    document.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', (e) => {
            if (e.target.open) {
                const contentEl = e.target.querySelector('.details-content');
                const previewId = contentEl.id;
                const scheduleId = previewId.replace('preview-', '');
                const schedule = state.schedules.find(s => s.id === scheduleId);
                if (schedule) {
                    loadPreview(scheduleId, schedule.file, contentEl);
                }
            }
        });
    });
}

/**
 * Load and render preview for a schedule
 */
async function loadPreview(id, file, containerEl) {
    // Return early if already loaded
    if (state.cache[id]) {
        renderPeriodTable(state.cache[id].schedules, containerEl);
        return;
    }

    try {
        const response = await fetch(`data/${file}`);
        if (!response.ok) throw new Error('Failed to load schedule');
        const data = await response.json();
        state.cache[id] = data;
        renderPeriodTable(data.schedules, containerEl);
    } catch (error) {
        console.error(`Error loading preview for ${id}:`, error);
        containerEl.innerHTML = '<p class="text-sm text-slate-400">Failed to load preview.</p>';
    }
}

/**
 * Render period table(s) in the preview container
 */
function renderPeriodTable(schedulesObj, containerEl) {
    let html = '';

    Object.entries(schedulesObj).forEach(([variantName, periods]) => {
        html += `<h4 class="text-sm font-bold text-navy mb-2 mt-4">${escapeHtml(variantName)}</h4>`;
        html += `
            <table class="w-full text-sm mb-4">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="text-left py-2 text-slate-500 font-medium">Period</th>
                        <th class="text-left py-2 text-slate-500 font-medium">Start</th>
                        <th class="text-left py-2 text-slate-500 font-medium">End</th>
                    </tr>
                </thead>
                <tbody>
                    ${periods.map(period => `
                        <tr class="border-b border-slate-100">
                            <td class="py-2 text-slate-700">${escapeHtml(period.period_name)}</td>
                            <td class="py-2 text-slate-600">${escapeHtml(period.start_time)}</td>
                            <td class="py-2 text-slate-600">${escapeHtml(period.end_time)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    });

    containerEl.innerHTML = html;
}

/**
 * Download schedule as JSON file
 */
async function downloadSchedule(file, schoolName) {
    try {
        // Find schedule in state by file name
        const schedule = state.schedules.find(s => s.file === file);
        if (!schedule) throw new Error('Schedule not found');

        // Fetch from cache or download
        let data;
        if (state.cache[schedule.id]) {
            data = state.cache[schedule.id];
        } else {
            const response = await fetch(`data/${file}`);
            if (!response.ok) throw new Error('Failed to download schedule');
            data = await response.json();
            state.cache[schedule.id] = data;
        }

        // Extract just the schedules object (HLS-compatible payload)
        const schedules = data.schedules;

        // Create download
        const blob = new Blob([JSON.stringify(schedules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kebabCase(schoolName)}-bell-schedule.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading schedule:', error);
        alert('Failed to download schedule. Please try again.');
    }
}

/**
 * Convert string to kebab-case
 */
function kebabCase(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
