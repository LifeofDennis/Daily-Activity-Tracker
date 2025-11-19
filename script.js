// --- 1. DOM element selection and Event Listeners ---
const STORAGE_KEY = 'dailyActivityTrackerData';
const form = document.getElementById('activity-form');
const activityList = document.getElementById('activity-list');
const filterCategory = document.getElementById('filter-category');
const sortBy = document.getElementById('sort-by');
const messageBox = document.getElementById('message-box');
const exportOutput = document.getElementById('export-output');
const chartCanvas = document.getElementById('category-chart');
const chartCtx = chartCanvas.getContext('2d');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const activityMessage = document.getElementById('activity-message');

let activities = [];
let editingId = null; // Track which activity is being edited
let currentFilter = 'all';
let currentSort = 'date-desc';

// --- Utility Functions ---

/**
 * Generates a unique ID (timestamp + random suffix).
 * @returns {string}
 */
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

/**
 * Displays a temporary success or error message.
 * @param {string} msg - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
const showMessage = (msg, type) => {
    messageBox.textContent = msg;
    messageBox.className = `message-box show ${type}`;
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000);
};

/**
 * Converts minutes to readable Hh Mmin format.
 * @param {number} totalMinutes
 * @returns {string}
 */
const formatDuration = (totalMinutes) => {
    if (totalMinutes < 0 || isNaN(totalMinutes)) return 'N/A';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
};

// --- 4. Local Storage Implementation ---

/**
 * Loads activities from localStorage.
 * @returns {Array<Object>}
 */
const loadActivities = () => {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        console.error("Error loading from local storage:", error);
        return [];
    }
};

/**
 * Saves current activities array to localStorage.
 */
const saveActivities = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error("Error saving to local storage:", error);
        showMessage("Data save failed! Local storage is full or unavailable.", 'error');
    }
};

// --- 2. Form Validation and Submission Handling ---
form.addEventListener('submit', handleFormSubmit);

function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const category = document.getElementById('category').value;
    const duration = parseInt(document.getElementById('duration').value, 10);
    const dateTime = document.getElementById('date-time').value;
    const notes = document.getElementById('notes').value.trim();
    const id = document.getElementById('activity-id').value;

    // Basic validation
    if (!name || !category || !duration || !dateTime || duration <= 0) {
        showMessage("Please fill out all required fields correctly.", 'error');
        return;
    }

    const activity = {
        id: id || generateId(),
        name: name,
        category: category,
        durationMinutes: duration,
        dateTime: new Date(dateTime).toISOString(), // Store as ISO string for sorting
        notes: notes,
        timestamp: new Date(dateTime).getTime() // For easy sorting
    };
    
    if (id) {
        // Edit existing activity
        const index = activities.findIndex(a => a.id === id);
        if (index !== -1) {
            activities[index] = activity;
            showMessage("Activity updated successfully!", 'success');
        }
    } else {
        // Add new activity
        activities.push(activity);
        showMessage("Activity logged successfully!", 'success');
    }
    
    // Clean up and refresh
    saveActivities();
    form.reset();
    resetEditMode();
    renderAll();
}

// --- 5. Activity display, filtering, and sorting ---

filterCategory.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderAll();
});

sortBy.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAll();
});

/**
 * Filters the activities based on the current filter setting.
 * @param {Array<Object>} list - The full list of activities.
 * @returns {Array<Object>} - The filtered list.
 */
const filterActivities = (list) => {
    if (currentFilter === 'all') {
        return list;
    }
    return list.filter(a => a.category === currentFilter);
};

/**
 * Sorts the activities based on the current sort setting.
 * @param {Array<Object>} list - The filtered list of activities.
 * @returns {Array<Object>} - The sorted list.
 */
const sortActivities = (list) => {
    const sorted = [...list];
    switch (currentSort) {
        case 'date-desc':
            return sorted.sort((a, b) => b.timestamp - a.timestamp);
        case 'date-asc':
            return sorted.sort((a, b) => a.timestamp - b.timestamp);
        case 'duration-desc':
            return sorted.sort((a, b) => b.durationMinutes - a.durationMinutes);
        case 'duration-asc':
            return sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
        default:
            return sorted;
    }
};

/**
 * Renders the filtered and sorted list of activities to the DOM.
 */
const renderActivities = () => {
    const filtered = filterActivities(activities);
    const sorted = sortActivities(filtered);

    activityList.innerHTML = ''; // Clear the list

    if (sorted.length === 0) {
        activityMessage.style.display = 'block';
        return;
    }
    activityMessage.style.display = 'none';

    sorted.forEach(activity => {
        const li = document.createElement('li');
        li.classList.add('activity-card');
        li.innerHTML = `
            <div class="card-header">
                <span class="card-title">${activity.name}</span>
                <span class="card-category">${activity.category}</span>
            </div>
            <div class="card-details">
                <span><strong>Duration:</strong> ${formatDuration(activity.durationMinutes)} (${activity.durationMinutes}m)</span>
                <span><strong>Time:</strong> ${new Date(activity.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span><strong>Date:</strong> ${new Date(activity.dateTime).toLocaleDateString()}</span>
                <span><strong>Logged ID:</strong> ${activity.id.slice(-6)}</span>
            </div>
            ${activity.notes ? `<div class="card-notes">${activity.notes}</div>` : ''}
            <div class="card-actions">
                <button class="btn btn-secondary edit-btn" data-id="${activity.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${activity.id}">Delete</button>
            </div>
        `;
        activityList.appendChild(li);
    });
    
    // Add listeners for dynamically created buttons
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => editActivity(e.target.dataset.id)));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => openConfirmModal('delete', e.target.dataset.id)));
};

/**
 * Populates the form for editing an existing activity.
 * @param {string} id - ID of the activity to edit.
 */
function editActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    // Set form values
    document.getElementById('activity-id').value = activity.id;
    document.getElementById('name').value = activity.name;
    document.getElementById('category').value = activity.category;
    document.getElementById('duration').value = activity.durationMinutes;
    
    // Format datetime-local input (YYYY-MM-DDThh:mm)
    const date = new Date(activity.dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    document.getElementById('date-time').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    document.getElementById('notes').value = activity.notes;

    // Change form appearance to edit mode
    formTitle.textContent = 'Edit Activity';
    submitBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-block';
    editingId = id;
    
    // Scroll to the form
    document.getElementById('input-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Resets the form and UI back to 'Add New Activity' mode.
 */
function resetEditMode() {
    document.getElementById('activity-id').value = '';
    formTitle.textContent = 'Log a New Activity';
    submitBtn.textContent = 'Add Activity';
    cancelEditBtn.style.display = 'none';
    editingId = null;
    form.reset();
}

cancelEditBtn.addEventListener('click', resetEditMode);

/**
 * Deletes an activity by its ID.
 * @param {string} id - ID of the activity to delete.
 */
function deleteActivity(id) {
    activities = activities.filter(a => a.id !== id);
    saveActivities();
    renderAll();
    showMessage("Activity successfully deleted.", 'success');
}

// --- 6. Statistics Calculation and Visualization ---

/**
 * Calculates statistics and updates the DOM.
 */
const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    let totalActivities = activities.length;
    let totalTimeToday = 0;
    let maxDuration = 0;
    let totalDuration = 0;
    let categoryBreakdown = {};
    
    activities.forEach(a => {
        totalDuration += a.durationMinutes;
        maxDuration = Math.max(maxDuration, a.durationMinutes);
        
        // Check if the activity happened today
        if (new Date(a.dateTime).getTime() >= today) {
            totalTimeToday += a.durationMinutes;
        }

        // Tally category time
        categoryBreakdown[a.category] = (categoryBreakdown[a.category] || 0) + a.durationMinutes;
    });

    // Update DOM stats
    document.getElementById('stat-count').textContent = totalActivities;
    document.getElementById('stat-time-today').textContent = formatDuration(totalTimeToday);
    document.getElementById('stat-max-duration').textContent = maxDuration;
    document.getElementById('stat-avg-duration').textContent = totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0;
    
    renderChart(categoryBreakdown);
};

const CHART_COLORS = {
    'Work': '#4f46e5', // Primary/Indigo
    'Personal': '#f59e0b', // Amber
    'Health': '#10b981', // Secondary/Emerald
    'Learning': '#f97316', // Orange
    'Leisure': '#06b6d4', // Cyan
    'Other': '#6b7280' // Gray
};

/**
 * Renders a simple Bar Chart for category breakdown using Canvas.
 * @param {Object} breakdown - Category breakdown data.
 */
function renderChart(breakdown) {
    // Get sorted data points
    const categories = Object.keys(breakdown);
    const data = Object.values(breakdown);
    const total = data.reduce((sum, val) => sum + val, 0);

    // Reset canvas size for high-res drawing and clear old content
    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.getBoundingClientRect();
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    chartCtx.scale(dpr, dpr);
    
    chartCtx.clearRect(0, 0, rect.width, rect.height);

    if (total === 0) {
        chartCtx.font = '16px Inter';
        chartCtx.fillStyle = varComputed('--color-text-light');
        chartCtx.textAlign = 'center';
        chartCtx.fillText('No duration data to display.', rect.width / 2, rect.height / 2);
        return;
    }

    const chartWidth = rect.width - 50;
    const chartHeight = rect.height - 50;
    const startX = 40;
    const startY = rect.height - 30;
    const barWidth = chartWidth / (categories.length * 2);
    const maxVal = Math.max(...data);
    const scaleY = chartHeight / maxVal;

    // Draw Y-axis (Time)
    chartCtx.strokeStyle = varComputed('--color-text-light');
    chartCtx.beginPath();
    chartCtx.moveTo(startX, 10);
    chartCtx.lineTo(startX, startY);
    chartCtx.stroke();
    
    // Draw X-axis (Categories)
    chartCtx.beginPath();
    chartCtx.moveTo(startX, startY);
    chartCtx.lineTo(rect.width - 10, startY);
    chartCtx.stroke();

    chartCtx.font = '12px Inter';
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'middle';

    // Draw Bars
    categories.forEach((category, i) => {
        const value = data[i];
        const x = startX + i * (barWidth * 2) + barWidth / 2;
        const barHeight = value * scaleY;
        
        // Bar
        chartCtx.fillStyle = CHART_COLORS[category] || '#ccc';
        chartCtx.fillRect(x, startY - barHeight, barWidth, barHeight);

        // Label (Category)
        chartCtx.fillStyle = varComputed('--color-text-dark');
        chartCtx.fillText(category, x + barWidth / 2, startY + 15);
        
        // Label (Value - above bar)
        chartCtx.fillText(value + 'm', x + barWidth / 2, startY - barHeight - 10);
    });
    
    // Y-axis label (Max Value)
    chartCtx.textAlign = 'right';
    chartCtx.fillText(maxVal + 'm', startX - 5, 20);
}

/**
 * Utility to get computed CSS variables in JS for canvas colors.
 * @param {string} name - CSS variable name (e.g., '--color-primary').
 */
function varComputed(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// --- 7. Data Management Utilities (Export/Import/Clear) ---

/**
 * Exports all activities as a JSON file for download.
 */
function exportData() {
    const jsonString = JSON.stringify(activities, null, 2);
    exportOutput.value = jsonString;
    exportOutput.style.display = 'block';

    // Create a blob and link to download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_tracker_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage("Data exported successfully!", 'success');
}

/**
 * Imports activities from a user-selected JSON file.
 * @param {Event} event - The file input change event.
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                activities = importedData.filter(a => a.id && a.name && a.durationMinutes && a.dateTime);
                saveActivities();
                renderAll();
                showMessage(`Successfully imported ${activities.length} activities.`, 'success');
            } else {
                throw new Error('Imported file is not a valid array.');
            }
        } catch (error) {
            console.error("Import error:", error);
            showMessage(`Failed to import data: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Clears all data after confirmation.
 */
function clearAllData() {
    activities = [];
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    showMessage("All activity data has been successfully cleared.", 'success');
    exportOutput.style.display = 'none';
}

// --- Modal Logic (for Edit/Delete/Clear Confirmation) ---
const confirmModal = document.getElementById('confirm-modal');
const confirmActionBtn = document.getElementById('confirm-action-btn');
let currentModalAction = { type: null, id: null };

function openConfirmModal(type, id = null) {
    currentModalAction = { type, id };
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    if (type === 'delete') {
        modalTitle.textContent = 'Confirm Deletion';
        modalMessage.textContent = 'Are you sure you want to delete this activity? This cannot be undone.';
        confirmActionBtn.classList.remove('btn-secondary');
        confirmActionBtn.classList.add('btn-danger');
    } else if (type === 'clear') {
        modalTitle.textContent = 'Confirm Clear All';
        modalMessage.textContent = 'Are you absolutely sure you want to clear ALL activity data? This action is irreversible.';
        confirmActionBtn.classList.remove('btn-secondary');
        confirmActionBtn.classList.add('btn-danger');
    } else {
        return; // Unknown action
    }
    
    confirmModal.classList.add('open');
}

function closeConfirmModal() {
    confirmModal.classList.remove('open');
    currentModalAction = { type: null, id: null };
}

confirmActionBtn.addEventListener('click', () => {
    const { type, id } = currentModalAction;
    closeConfirmModal();
    
    if (type === 'delete' && id) {
        deleteActivity(id);
    } else if (type === 'clear') {
        clearAllData();
    }
});

// --- Initialization ---

/**
 * The main function to load data and render all components.
 */
function renderAll() {
    renderActivities();
    calculateStats();
}

window.onload = () => {
    // Set initial date/time to now for convenience
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('date-time').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Load data and render
    activities = loadActivities();
    renderAll();
    
    // Add initial resize listener for chart responsiveness
    window.addEventListener('resize', renderAll);
};