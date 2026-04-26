const PENALTIES_STORAGE_KEY = 'campus_care_penalties';
const STUDENTS_STORAGE_KEY = 'campus_care_students';
const REPORTS_STORAGE_KEY = 'campus_care_reports';

let penalties = [];
let currentEditPenaltyId = null;
let selectedPenalties = new Set();

// Replace with your actual EmailJS credentials
const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_docst',
    TEMPLATE_ID: 'template_penalty_notification',
    PUBLIC_KEY: 'YOUR_PUBLIC_KEY'
};

// Drawer functionality - Always visible on desktop
function initializeDrawer() {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    const adminPill = document.getElementById('adminPill');
    
    window.openDrawer = function() {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    };
    
    window.closeDrawer = function() {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    };
    
    // Only add mobile-specific listeners
    if (window.innerWidth <= 768) {
        if (hamburger) hamburger.addEventListener('click', window.openDrawer);
        if (drawerClose) drawerClose.addEventListener('click', window.closeDrawer);
        if (overlay) overlay.addEventListener('click', window.closeDrawer);
        if (adminPill) adminPill.addEventListener('click', window.openDrawer);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            window.closeDrawer();
            drawer.classList.remove('open');
        } else {
            drawer.classList.remove('open');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeDrawer();
    });
}

// Initialize EmailJS
function initializeEmailJS() {
    // Load EmailJS script dynamically
    if (typeof emailjs === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = () => {
            emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
            console.log('EmailJS initialized');
        };
        document.head.appendChild(script);
    } else if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDrawer();
    initializeEmailJS();
    loadPenalties();
    setupEventListeners();
    renderPenaltiesTable();
    updateStats();
    loadStudentsForDropdown();
});

// Load Students for dropdown
function loadStudentsForDropdown() {
    const studentIdInput = document.getElementById('penaltyStudentId');
    if (!studentIdInput) return;
    
    const studentsData = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (studentsData) {
        const students = JSON.parse(studentsData);
        // Create datalist for autocomplete
        let datalist = document.getElementById('studentIdList');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'studentIdList';
            studentIdInput.setAttribute('list', 'studentIdList');
            document.body.appendChild(datalist);
        }
        datalist.innerHTML = students.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
    }
}

// Get student email by ID
function getStudentEmail(studentId) {
    const studentsData = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (studentsData) {
        const students = JSON.parse(studentsData);
        const student = students.find(s => s.id === studentId || s.studentId === studentId);
        return student ? student.email : null;
    }
    return null;
}

// Get student name by ID
function getStudentName(studentId) {
    const studentsData = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (studentsData) {
        const students = JSON.parse(studentsData);
        const student = students.find(s => s.id === studentId || s.studentId === studentId);
        return student ? student.name : 'Student';
    }
    return 'Student';
}

// Send email notification to student
async function sendPenaltyNotification(penalty) {
    const studentEmail = getStudentEmail(penalty.studentId);
    const studentName = getStudentName(penalty.studentId);
    
    if (!studentEmail) {
        console.log('No email found for student:', penalty.studentId);
        showNotification(`Warning: No email found for student ${penalty.studentId}`, 'warning');
        return false;
    }
    
    // Check if EmailJS is available
    if (typeof emailjs === 'undefined') {
        console.log('EmailJS not loaded, simulating email send');
        simulateEmailSend(penalty, studentEmail, studentName);
        return true;
    }
    
    try {
        const templateParams = {
            to_email: studentEmail,
            to_name: studentName,
            student_id: penalty.studentId,
            violation: penalty.violation,
            service_type: penalty.serviceType,
            hours: penalty.hours,
            deadline: formatDate(penalty.deadline),
            status: penalty.status,
            admin_name: localStorage.getItem('adminName') || 'Administrator',
            current_year: new Date().getFullYear()
        };
        
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams
        );
        
        console.log('Email sent successfully:', response);
        showNotification(`Email notification sent to ${studentEmail}`, 'success');
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        simulateEmailSend(penalty, studentEmail, studentName);
        return false;
    }
}

// Simulate email send (for testing without EmailJS)
function simulateEmailSend(penalty, email, name) {
    console.log('=== SIMULATED EMAIL ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Penalty Notification - ${penalty.violation}`);
    console.log(`Body: Dear ${name},\n\nYou have been assigned a penalty:\n- Violation: ${penalty.violation}\n- Service Type: ${penalty.serviceType}\n- Hours: ${penalty.hours}\n- Deadline: ${formatDate(penalty.deadline)}\n- Status: ${penalty.status}\n\nPlease complete your service hours before the deadline.\n\nRegards,\nDOCST Administration`);
    console.log('=======================');
    showNotification(`[TEST] Email would be sent to ${email}`, 'info');
}

// Load Penalties from localStorage
function loadPenalties() {
    const stored = localStorage.getItem(PENALTIES_STORAGE_KEY);
    if (stored) {
        penalties = JSON.parse(stored);
    } else {
        // Load sample penalties for demo
        penalties = getSamplePenalties();
        savePenalties();
    }
}

// Sample penalties for demonstration
function getSamplePenalties() {
    return [
        {
            id: Date.now() - 86400000,
            studentId: '2024-00001',
            violation: 'Uniform Violation',
            serviceType: 'Community Service',
            hours: 5,
            status: 'pending',
            deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            dateCreated: new Date().toISOString(),
            emailSent: true
        },
        {
            id: Date.now() - 172800000,
            studentId: '2024-00002',
            violation: 'Tardiness',
            serviceType: 'Cleaning Duty',
            hours: 3,
            status: 'in-progress',
            deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            dateCreated: new Date().toISOString(),
            emailSent: true
        }
    ];
}

// Save Penalties to localStorage
function savePenalties() {
    localStorage.setItem(PENALTIES_STORAGE_KEY, JSON.stringify(penalties));
    
    // Also update the admin dashboard stats
    updateAdminDashboardStats();
}

// Update admin dashboard stats
function updateAdminDashboardStats() {
    // Create or update event for dashboard
    const dashboardUpdateEvent = new CustomEvent('penaltiesUpdated', { 
        detail: { 
            totalPenalties: penalties.length,
            activePenalties: penalties.filter(p => p.status !== 'completed').length,
            completedHours: penalties.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseInt(p.hours || 0), 0)
        } 
    });
    window.dispatchEvent(dashboardUpdateEvent);
    
    // Also save to a separate storage for dashboard access
    localStorage.setItem('dashboard_penalties_summary', JSON.stringify({
        totalPenalties: penalties.length,
        activePenalties: penalties.filter(p => p.status !== 'completed').length,
        completedHours: penalties.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseInt(p.hours || 0), 0),
        lastUpdated: new Date().toISOString()
    }));
}

// Update Statistics
function updateStats() {
    const totalPenalties = penalties.length;
    const pendingCases = penalties.filter(p => p.status === 'pending').length;
    const inProgressCases = penalties.filter(p => p.status === 'in-progress').length;
    const completedCases = penalties.filter(p => p.status === 'completed').length;
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseInt(p.hours || 0), 0);
    
    // Get total students from student management system
    let totalStudents = 0;
    const studentsData = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (studentsData) {
        const students = JSON.parse(studentsData);
        totalStudents = students.length;
    }
    
    const totalStudentsEl = document.getElementById('totalStudents');
    const totalPenaltiesEl = document.getElementById('totalPenalties');
    const pendingCasesEl = document.getElementById('pendingCases');
    const completedHoursEl = document.getElementById('completedHours');
    
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    if (totalPenaltiesEl) totalPenaltiesEl.textContent = totalPenalties;
    if (pendingCasesEl) pendingCasesEl.textContent = pendingCases;
    if (completedHoursEl) completedHoursEl.textContent = completedHours;
    
    // Update additional stats if elements exist
    const inProgressEl = document.getElementById('inProgressCases');
    const completedCasesEl = document.getElementById('completedCases');
    if (inProgressEl) inProgressEl.textContent = inProgressCases;
    if (completedCasesEl) completedCasesEl.textContent = completedCases;
}

// Render Penalties Table
function renderPenaltiesTable() {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 60px;">
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <div class="empty-title">No Penalty Records</div>
                        <div class="empty-sub">Click "Add Penalty" to create a new penalty record</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort penalties by date (newest first)
    const sortedPenalties = [...penalties].sort((a, b) => b.id - a.id);
    
    tbody.innerHTML = sortedPenalties.map(penalty => `
        <tr data-penalty-id="${penalty.id}">
            <td>
                <input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}" ${selectedPenalties.has(penalty.id) ? 'checked' : ''}>
            </td>
            <td><strong>${escapeHtml(penalty.studentId)}</strong></td>
            <td>${escapeHtml(penalty.violation)}</td>
            <td>${escapeHtml(penalty.serviceType)}</td>
            <td>${penalty.hours}</td>
            <td>
                <span class="status-badge status-${penalty.status === 'in-progress' ? 'in-progress' : penalty.status}">
                    ${penalty.status === 'in-progress' ? 'In Progress' : penalty.status.charAt(0).toUpperCase() + penalty.status.slice(1)}
                </span>
            </td>
            <td>${formatDate(penalty.deadline)}</td>
            <td>
                <button class="table-action-btn view-btn" onclick="viewPenalty('${penalty.id}')" title="View/Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z"/>
                    </svg>
                </button>
                <button class="table-action-btn resend-btn" onclick="resendEmailNotification('${penalty.id}')" title="Resend Email">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Re-attach checkbox event listeners
    document.querySelectorAll('.penalty-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            if (e.target.checked) {
                selectedPenalties.add(id);
            } else {
                selectedPenalties.delete(id);
            }
            updateSelectAllCheckbox();
        });
    });
    
    updateSelectAllCheckbox();
}

// Resend email notification
window.resendEmailNotification = async function(id) {
    const penalty = penalties.find(p => p.id === parseInt(id));
    if (penalty) {
        await sendPenaltyNotification(penalty);
    }
};

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    
    const allCheckboxes = document.querySelectorAll('.penalty-checkbox');
    if (allCheckboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }
    
    const checkedCount = document.querySelectorAll('.penalty-checkbox:checked').length;
    selectAll.checked = checkedCount === allCheckboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Penalty Button
    const addBtn = document.getElementById('addPenaltyBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddPenaltyModal);
    }
    
    // Modal Close
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePenaltyModal);
    }
    
    // Modal Overlay Click
    const modal = document.getElementById('penaltyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePenaltyModal();
        });
    }
    
    // Penalty Form Submit
    const penaltyForm = document.getElementById('penaltyForm');
    if (penaltyForm) {
        penaltyForm.addEventListener('submit', savePenalty);
    }
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.penalty-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const id = parseInt(cb.getAttribute('data-id'));
                if (e.target.checked) {
                    selectedPenalties.add(id);
                } else {
                    selectedPenalties.delete(id);
                }
            });
        });
    }
    
    // Edit Button
    const editBtn = document.getElementById('editPenaltyBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (selectedPenalties.size === 0) {
                showNotification('Please select a penalty to edit', 'warning');
            } else if (selectedPenalties.size > 1) {
                showNotification('Please select only one penalty to edit', 'warning');
            } else {
                const id = Array.from(selectedPenalties)[0];
                editPenaltyById(id);
            }
        });
    }
    
    // Delete Button
    const deleteBtn = document.getElementById('deletePenaltyBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (selectedPenalties.size === 0) {
                showNotification('Please select at least one penalty to delete', 'warning');
            } else {
                deleteSelectedPenalties();
            }
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Escape key for modal
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('penaltyModal');
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closePenaltyModal();
        }
    });
}

function openAddPenaltyModal() {
    currentEditPenaltyId = null;
    document.getElementById('modalTitle').textContent = 'Add New Penalty';
    document.getElementById('penaltyForm').reset();
    document.getElementById('penaltyId').value = '';
    document.getElementById('penaltyModal').classList.add('open');
}

function editPenaltyById(id) {
    const penalty = penalties.find(p => p.id === id);
    if (!penalty) return;
    
    currentEditPenaltyId = id;
    document.getElementById('modalTitle').textContent = 'Edit Penalty';
    document.getElementById('penaltyId').value = penalty.id;
    document.getElementById('penaltyStudentId').value = penalty.studentId;
    document.getElementById('penaltyViolation').value = penalty.violation;
    document.getElementById('penaltyServiceType').value = penalty.serviceType;
    document.getElementById('penaltyHours').value = penalty.hours;
    document.getElementById('penaltyStatus').value = penalty.status;
    document.getElementById('penaltyDeadline').value = penalty.deadline;
    document.getElementById('penaltyModal').classList.add('open');
}

async function savePenalty(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('penaltyStudentId').value;
    const violation = document.getElementById('penaltyViolation').value;
    const serviceType = document.getElementById('penaltyServiceType').value;
    const hours = parseInt(document.getElementById('penaltyHours').value);
    const status = document.getElementById('penaltyStatus').value;
    const deadline = document.getElementById('penaltyDeadline').value;
    
    const penaltyData = {
        studentId: studentId,
        violation: violation,
        serviceType: serviceType,
        hours: hours,
        status: status,
        deadline: deadline
    };
    
    let isNew = false;
    
    if (currentEditPenaltyId) {
        // Update existing penalty
        const index = penalties.findIndex(p => p.id === currentEditPenaltyId);
        if (index !== -1) {
            penalties[index] = { ...penalties[index], ...penaltyData };
            showNotification('Penalty updated successfully!', 'success');
        }
    } else {
        // Add new penalty
        const newPenalty = {
            id: Date.now(),
            ...penaltyData,
            dateCreated: new Date().toISOString(),
            emailSent: false
        };
        penalties.push(newPenalty);
        isNew = true;
        showNotification('Penalty added successfully!', 'success');
    }
    
    savePenalties();
    renderPenaltiesTable();
    updateStats();
    closePenaltyModal();
    
    // Send email notification for new penalty
    if (isNew) {
        const newPenalty = penalties.find(p => p.studentId === studentId && p.dateCreated);
        if (newPenalty) {
            await sendPenaltyNotification(newPenalty);
            newPenalty.emailSent = true;
            savePenalties();
        }
    }
}

function deleteSelectedPenalties() {
    if (confirm(`Are you sure you want to delete ${selectedPenalties.size} penalty/penalties?`)) {
        penalties = penalties.filter(p => !selectedPenalties.has(p.id));
        selectedPenalties.clear();
        savePenalties();
        renderPenaltiesTable();
        updateStats();
        showNotification('Penalties deleted successfully!', 'success');
    }
}

window.viewPenalty = function(id) {
    editPenaltyById(parseInt(id));
};

function closePenaltyModal() {
    const modal = document.getElementById('penaltyModal');
    if (modal) modal.classList.remove('open');
    currentEditPenaltyId = null;
    const form = document.getElementById('penaltyForm');
    if (form) form.reset();
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/LANDING PAGE/land.html';
        }, 1000);
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    const bgColor = type === 'success' ? '#1D4ED8' : (type === 'warning' ? '#D97706' : '#475569');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for external use (for reporting page)
window.DOCSTPenalties = {
    addPenalty: async function(penaltyData) {
        const newPenalty = {
            id: Date.now(),
            ...penaltyData,
            dateCreated: new Date().toISOString(),
            emailSent: false
        };
        penalties.push(newPenalty);
        savePenalties();
        renderPenaltiesTable();
        updateStats();
        
        // Send email notification
        await sendPenaltyNotification(newPenalty);
        newPenalty.emailSent = true;
        savePenalties();
        
        return newPenalty;
    },
    getPenalties: function() {
        return penalties;
    },
    getStudentPenalties: function(studentId) {
        return penalties.filter(p => p.studentId === studentId);
    }
};