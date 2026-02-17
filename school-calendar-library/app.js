// State management
const state = {
    calendars: [],      // manifest data
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
        state.calendars = await response.json();
        renderFilterBar();
        renderCards();
    } catch (error) {
        console.error('Error loading manifest:', error);
        const cardGrid = document.getElementById('card-grid');
        cardGrid.innerHTML = '<div class="col-span-full text-center text-slate-600">Failed to load calendar library.</div>';
    }
}

/**
 * Extract unique tags from all calendars
 */
function getAllUniqueTags() {
    const tagsSet = new Set();
    state.calendars.forEach(calendar => {
        if (Array.isArray(calendar.tags)) {
            calendar.tags.forEach(tag => tagsSet.add(tag));
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
 * Get filtered calendars based on active tag
 */
function getFilteredCalendars() {
    if (state.activeTag === 'All') {
        return state.calendars;
    }
    return state.calendars.filter(calendar =>
        Array.isArray(calendar.tags) && calendar.tags.includes(state.activeTag)
    );
}

/**
 * Render card grid with calendar cards
 */
function renderCards() {
    const cardGrid = document.getElementById('card-grid');
    const filteredCalendars = getFilteredCalendars();

    if (filteredCalendars.length === 0) {
        cardGrid.innerHTML = '<div class="col-span-full text-center text-slate-600">No calendars found for this filter.</div>';
        return;
    }

    cardGrid.innerHTML = filteredCalendars.map(calendar => `
        <div class="card border-l-4 border-hl-orange p-8 fade-in-up">
            <div class="flex items-start gap-4 mb-4">
                <div class="icon-container">
                    <svg class="w-6 h-6 text-hl-orange" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-navy">${escapeHtml(calendar.school_name)}</h3>
                    <p class="text-sm text-slate-500">${escapeHtml(calendar.location)} | ${escapeHtml(calendar.academic_year)}</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-2">
                ${(Array.isArray(calendar.tags) ? calendar.tags : [])
                    .map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
                    .join('')
                }
            </div>
            <p class="text-sm text-slate-500 mb-4">${calendar.event_count} closing/special events</p>
            <details class="mb-4">
                <summary class="details-summary">Preview Calendar</summary>
                <div class="details-content" id="preview-${calendar.id}">
                    <p class="text-sm text-slate-400">Loading...</p>
                </div>
            </details>
            <button class="btn-primary w-full cursor-pointer" data-file="${calendar.file}" data-name="${escapeHtml(calendar.school_name)}">
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
            downloadCalendar(file, name);
        });
    });

    // Details toggle
    document.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', (e) => {
            if (e.target.open) {
                const contentEl = e.target.querySelector('.details-content');
                const previewId = contentEl.id;
                const calendarId = previewId.replace('preview-', '');
                const calendar = state.calendars.find(c => c.id === calendarId);
                if (calendar) {
                    loadPreview(calendarId, calendar.file, contentEl);
                }
            }
        });
    });
}

/**
 * Load and render preview for a calendar
 */
async function loadPreview(id, file, containerEl) {
    // Return early if already loaded
    if (state.cache[id]) {
        renderEventList(state.cache[id].calendar, containerEl);
        return;
    }

    try {
        const response = await fetch(`data/${file}`);
        if (!response.ok) throw new Error('Failed to load calendar');
        const data = await response.json();
        state.cache[id] = data;
        renderEventList(data.calendar, containerEl);
    } catch (error) {
        console.error(`Error loading preview for ${id}:`, error);
        containerEl.innerHTML = '<p class="text-sm text-slate-400">Failed to load preview.</p>';
    }
}

/**
 * Render event list/table in the preview container
 */
function renderEventList(events, containerEl) {
    if (!Array.isArray(events) || events.length === 0) {
        containerEl.innerHTML = '<p class="text-sm text-slate-500">No events in calendar.</p>';
        return;
    }

    const html = `
        <table class="w-full text-sm mb-4">
            <thead>
                <tr class="border-b border-slate-200">
                    <th class="text-left py-2 text-slate-500 font-medium">Date</th>
                    <th class="text-left py-2 text-slate-500 font-medium">Classification</th>
                    <th class="text-left py-2 text-slate-500 font-medium">Event</th>
                </tr>
            </thead>
            <tbody>
                ${events.map(event => `
                    <tr class="border-b border-slate-100">
                        <td class="py-2 text-slate-700">${formatDate(event.date)}</td>
                        <td class="py-2">${getBadgeHtml(event.classification)}</td>
                        <td class="py-2 text-slate-700">${escapeHtml(event.event_name)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p class="text-sm text-slate-600 font-medium">${events.length} events total</p>
    `;

    containerEl.innerHTML = html;
}

/**
 * Get badge HTML for classification
 */
function getBadgeHtml(classification) {
    const badges = {
        'Holiday': '<span class="badge-holiday">Holiday</span>',
        'Early-Release': '<span class="badge-early-release">Early-Release</span>',
        'PD': '<span class="badge-pd">PD</span>'
    };
    return badges[classification] || `<span class="tag-pill">${escapeHtml(classification)}</span>`;
}

/**
 * Format date from YYYY-MM-DD to readable format (e.g., "Sep 1, 2025")
 */
function formatDate(dateStr) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = dateStr.split('-');
    const month = months[parseInt(parts[1], 10) - 1];
    const day = parseInt(parts[2], 10);
    return `${month} ${day}, ${parts[0]}`;
}

/**
 * Download calendar as JSON file
 */
async function downloadCalendar(file, schoolName) {
    try {
        // Find calendar in state by file name
        const calendar = state.calendars.find(c => c.file === file);
        if (!calendar) throw new Error('Calendar not found');

        // Fetch from cache or download
        let data;
        if (state.cache[calendar.id]) {
            data = state.cache[calendar.id];
        } else {
            const response = await fetch(`data/${file}`);
            if (!response.ok) throw new Error('Failed to download calendar');
            data = await response.json();
            state.cache[calendar.id] = data;
        }

        // Extract just the calendar array (HLS-compatible payload)
        const calendarPayload = data.calendar;

        // Create download
        const blob = new Blob([JSON.stringify(calendarPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kebabCase(schoolName)}-calendar.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading calendar:', error);
        alert('Failed to download calendar. Please try again.');
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
