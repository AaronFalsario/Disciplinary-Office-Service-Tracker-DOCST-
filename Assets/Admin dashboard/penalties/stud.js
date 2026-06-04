import { initAdminDrawer } from '../../drawer-admin.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ INITIALIZE DRAWER ============
initAdminDrawer();

// ============ GLOBAL VARIABLES ============
let toastContainer = null;
let currentAdmin = null;
let unreadNotifications = [];
let notificationInterval = null;
let notificationBadge = null;
let studentsList = [];
let selectedStudent = null;
let searchTimeout = null;

// ============ TOAST NOTIFICATION SYSTEM ============
function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeToast(toast) {
    toast.classList.add('toast-removing');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 250);
}

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconHtml = '';
    let defaultTitle = '';
    
    switch(type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle"></i>';
            defaultTitle = 'Success';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle"></i>';
            defaultTitle = 'Error';
            break;
        case 'warning':
            iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
            defaultTitle = 'Warning';
            break;
        case 'info':
        default:
            iconHtml = '<i class="fas fa-info-circle"></i>';
            defaultTitle = 'Information';
            break;
    }
    
    const finalTitle = title || defaultTitle;
    
    toast.innerHTML = `
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(finalTitle)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toast);
    });
    
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
            removeToast(toast);
        }
    });
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                removeToast(toast);
            }
        }, duration);
    }
    
    return toast;
}

function showSuccessToast(message, title = 'Success', duration = 4000) {
    return showToast(message, 'success', title, duration);
}

function showErrorToast(message, title = 'Error', duration = 5000) {
    return showToast(message, 'error', title, duration);
}

function showWarningToast(message, title = 'Warning', duration = 4000) {
    return showToast(message, 'warning', title, duration);
}

function showInfoToast(message, title = 'Information', duration = 3000) {
    return showToast(message, 'info', title, duration);
}

// ============ NOTIFICATION SYSTEM ============
async function getCurrentAdminInfo() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            const { data: adminData } = await supabase
                .from('admins')
                .select('admin_id, full_name')
                .eq('email', user.email)
                .maybeSingle();
            
            if (adminData) {
                currentAdmin = adminData;
                return adminData;
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting admin info:', error);
        return null;
    }
}

async function fetchNotifications() {
    try {
        if (!currentAdmin && !(await getCurrentAdminInfo())) return [];
        
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`admin_id.eq.${currentAdmin?.admin_id},admin_id.is.null`)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        unreadNotifications = data || [];
        updateNotificationBadge();
        return unreadNotifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

function updateNotificationBadge() {
    if (!notificationBadge) {
        const notifyBtn = document.getElementById('notifyBtn');
        if (notifyBtn) {
            notificationBadge = document.createElement('span');
            notificationBadge.id = 'notificationBadge';
            notificationBadge.className = 'notification-badge';
            notifyBtn.style.position = 'relative';
            notifyBtn.appendChild(notificationBadge);
        }
    }
    
    const count = unreadNotifications.length;
    if (notificationBadge) {
        if (count > 0) {
            notificationBadge.textContent = count > 99 ? '99+' : count;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}

function startNotificationPolling() {
    if (notificationInterval) clearInterval(notificationInterval);
    fetchNotifications();
    notificationInterval = setInterval(() => {
        fetchNotifications();
    }, 30000);
}

// ============ ENHANCED STUDENT SEARCH ============
async function searchStudents(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        const resultsDiv = document.getElementById('studentSearchResults');
        if (resultsDiv) resultsDiv.classList.remove('show');
        return [];
    }
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, email')
            .or(`name.ilike.%${searchTerm}%, email.ilike.%${searchTerm}%`)
            .limit(10);
        
        if (error) throw error;
        
        displaySearchResults(data || []);
        return data || [];
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

function displaySearchResults(students) {
    const resultsDiv = document.getElementById('studentSearchResults');
    if (!resultsDiv) return;
    
    if (students.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">No students found</div>';
        resultsDiv.classList.add('show');
        return;
    }
    
    resultsDiv.innerHTML = students.map(student => `
        <div class="search-result-item" data-id="${student.id}" data-name="${escapeHtml(student.name)}" data-email="${escapeHtml(student.email)}">
            <div class="search-result-name">${escapeHtml(student.name)}</div>
            <div class="search-result-email">${escapeHtml(student.email)}</div>
        </div>
    `).join('');
    
    resultsDiv.classList.add('show');
    
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            selectStudent({
                id: item.dataset.id,
                name: item.dataset.name,
                email: item.dataset.email
            });
        });
    });
}

function selectStudent(student) {
    selectedStudent = student;
    
    document.getElementById('penaltyStudentId').value = student.id;
    document.getElementById('penaltyStudentName').value = student.name;
    document.getElementById('penaltyStudentEmail').value = student.email;
    
    const selectedInfo = document.getElementById('selectedStudentInfo');
    const selectedDetails = document.getElementById('selectedStudentDetails');
    const searchInput = document.getElementById('studentSearchInput');
    
    if (selectedDetails) {
        selectedDetails.innerHTML = `
            <strong>${escapeHtml(student.name)}</strong><br>
            <small>ID: ${escapeHtml(student.id)} | Email: ${escapeHtml(student.email)}</small>
        `;
    }
    
    if (selectedInfo) selectedInfo.classList.add('show');
    if (searchInput) searchInput.value = student.name;
    
    const resultsDiv = document.getElementById('studentSearchResults');
    if (resultsDiv) resultsDiv.classList.remove('show');
    
    const manualGroup = document.getElementById('manualEntryGroup');
    if (manualGroup) manualGroup.style.display = 'none';
    
    showSuccessToast(`Selected: ${student.name}`, 'Student Selected', 2000);
}

function clearStudentSelection() {
    selectedStudent = null;
    document.getElementById('penaltyStudentId').value = '';
    document.getElementById('penaltyStudentName').value = '';
    document.getElementById('penaltyStudentEmail').value = '';
    document.getElementById('studentSearchInput').value = '';
    document.getElementById('selectedStudentInfo').classList.remove('show');
}

function setupStudentSearch() {
    const searchInput = document.getElementById('studentSearchInput');
    const clearBtn = document.getElementById('clearSelectionBtn');
    const toggleManualBtn = document.getElementById('toggleManualEntry');
    const manualGroup = document.getElementById('manualEntryGroup');
    const manualStudentId = document.getElementById('manualStudentId');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (selectedStudent) {
            clearStudentSelection();
        }
        
        searchTimeout = setTimeout(() => {
            const term = e.target.value.trim();
            if (term.length >= 2) {
                searchStudents(term);
            } else {
                const resultsDiv = document.getElementById('studentSearchResults');
                if (resultsDiv) resultsDiv.classList.remove('show');
            }
        }, 300);
    });
    
    document.addEventListener('click', (e) => {
        const resultsDiv = document.getElementById('studentSearchResults');
        const searchContainer = document.querySelector('.student-search-container');
        if (resultsDiv && searchContainer && !searchContainer.contains(e.target)) {
            resultsDiv.classList.remove('show');
        }
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearStudentSelection();
            showInfoToast('Student selection cleared', 'Cleared', 1500);
        });
    }
    
    if (toggleManualBtn && manualGroup) {
        toggleManualBtn.addEventListener('click', () => {
            if (manualGroup.style.display === 'none' || manualGroup.style.display === '') {
                manualGroup.style.display = 'block';
                toggleManualBtn.textContent = '🔍 Search from List';
                clearStudentSelection();
                if (manualStudentId) manualStudentId.value = '';
            } else {
                manualGroup.style.display = 'none';
                toggleManualBtn.textContent = '📝 Enter Student ID Manually';
            }
        });
    }
    
    if (manualStudentId) {
        manualStudentId.addEventListener('input', (e) => {
            document.getElementById('penaltyStudentId').value = e.target.value;
        });
    }
}

// ============ QUICK ADD STUDENT ============
function setupQuickAddModal() {
    const quickAddBtn = document.getElementById('quickAddStudent');
    const modal = document.getElementById('quickAddStudentModal');
    const cancelBtn = document.getElementById('quickAddCancel');
    const submitBtn = document.getElementById('quickAddSubmit');
    
    if (!quickAddBtn || !modal) return;
    
    quickAddBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('quickStudentName').value = '';
            document.getElementById('quickStudentId').value = '';
            document.getElementById('quickStudentEmail').value = '';
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const name = document.getElementById('quickStudentName')?.value.trim();
            const studentId = document.getElementById('quickStudentId')?.value.trim();
            const email = document.getElementById('quickStudentEmail')?.value.trim();
            
            if (!name || !studentId || !email) {
                showErrorToast('Please fill all fields', 'Missing Information');
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('students')
                    .insert([{
                        id: studentId,
                        name: name,
                        email: email,
                        status: 'active',
                        created_at: new Date().toISOString()
                    }])
                    .select();
                
                if (error) throw error;
                
                showSuccessToast(`Student ${name} added successfully!`, 'Student Added');
                modal.style.display = 'none';
                
                document.getElementById('quickStudentName').value = '';
                document.getElementById('quickStudentId').value = '';
                document.getElementById('quickStudentEmail').value = '';
                
                await loadStudentsList();
                
                selectStudent({
                    id: studentId,
                    name: name,
                    email: email
                });
                
            } catch (error) {
                console.error('Error adding student:', error);
                showErrorToast('Failed to add student. ID might already exist.', 'Error');
            }
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ============ LOAD STUDENTS LIST ============
async function loadStudentsList() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, email')
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        studentsList = data || [];
        return studentsList;
    } catch (error) {
        console.error('Error loading students:', error);
        return [];
    }
}

// ============ LOAD PENALTIES ============
async function loadPenalties() {
    try {
        showInfoToast('Loading penalties...', 'Please Wait', 1000);
        
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayPenalties(data || []);
        updateStats(data || []);
        
        showSuccessToast(`Loaded ${data?.length || 0} penalty records`, 'Data Loaded', 2000);
        
    } catch (error) {
        console.error('Error loading penalties:', error);
        showErrorToast('Failed to load penalties', 'Error');
    }
}

// ============ DISPLAY PENALTIES WITH OFFENSE LEVEL ============
function displayPenalties(penalties) {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = '<table><td colspan="9" style="text-align: center; padding: 40px;">No penalties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = penalties.map(penalty => {
        // Get offense level display
        const offenseLevel = penalty.offense_level || '1st Offense';
        let offenseClass = '';
        let offenseDisplay = offenseLevel;
        
        if (offenseLevel === '1st Offense') {
            offenseClass = 'offense-first';
            offenseDisplay = '⚠️ 1st Offense (Warning)';
        } else if (offenseLevel === '2nd Offense') {
            offenseClass = 'offense-second';
            offenseDisplay = '⚠️ 2nd Offense';
        } else if (offenseLevel === '3rd Offense') {
            offenseClass = 'offense-third';
            offenseDisplay = '🔴 3rd Offense';
        }
        
        const isWarning = penalty.is_warning || offenseLevel === '1st Offense';
        const hoursDisplay = isWarning ? '<span class="warning-badge">⚠️ Warning Only</span>' : `${penalty.hours || 0} hrs`;
        
        return `
            <tr data-id="${penalty.id}">
                <td class="checkbox-cell" style="text-align: center;">
                    <input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}">
                </td>
                <td><strong>${escapeHtml(penalty.student_name || 'Unknown Student')}</strong></td>
                <td>${escapeHtml(penalty.violation || 'N/A')}</td>
                <td><span class="offense-badge ${offenseClass}">${escapeHtml(offenseDisplay)}</span></td>
                <td>${escapeHtml(penalty.service_type || 'N/A')}</td>
                <td class="hours-cell">${hoursDisplay}</td>
                <td><span class="status-badge status-${penalty.status || 'pending'}">${penalty.status || 'pending'}</span></td>
                <td>${penalty.deadline ? new Date(penalty.deadline).toLocaleDateString() : 'N/A'}</td>
                <td class="action-btns">
                    <button class="edit-penalty-btn" data-id="${penalty.id}" title="Edit">
                        <i class="fas fa-edit" style="color: var(--blue);"></i>
                    </button>
                    <button class="delete-penalty-btn" data-id="${penalty.id}" title="Delete">
                        <i class="fas fa-trash" style="color: var(--red);"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.edit-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editPenalty(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePenalty(btn.dataset.id);
        });
    });
}

function updateStats(penalties) {
    const totalStudents = document.getElementById('totalStudents');
    const totalPenalties = document.getElementById('totalPenalties');
    const pendingCases = document.getElementById('pendingCases');
    const completedHours = document.getElementById('completedHours');
    
    const uniqueStudents = new Set(penalties.map(p => p.student_id));
    if (totalStudents) totalStudents.textContent = uniqueStudents.size;
    if (totalPenalties) totalPenalties.textContent = penalties.length;
    
    const pending = penalties.filter(p => p.status === 'pending').length;
    if (pendingCases) pendingCases.textContent = pending;
    
    const completed = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.hours || 0), 0);
    if (completedHours) completedHours.textContent = completed;
}

// ============ FIXED SAVE PENALTY - HANDLES WARNINGS CORRECTLY ============
async function savePenalty(event) {
    event.preventDefault();
    
    const penaltyId = document.getElementById('penaltyId').value;
    let studentId = document.getElementById('penaltyStudentId').value.trim();
    const studentName = document.getElementById('penaltyStudentName').value.trim();
    const manualStudentId = document.getElementById('manualStudentId')?.value.trim();
    
    // Get offense level from hidden input
    const offenseLevel = document.getElementById('offenseLevel')?.value || '1st Offense';
    const isWarning = offenseLevel === '1st Offense';
    
    if (!studentId && manualStudentId) {
        studentId = manualStudentId;
    }
    
    const violation = document.getElementById('penaltyViolation').value;
    
    // Only get these fields if NOT a warning
    const serviceType = isWarning ? null : document.getElementById('penaltyServiceType').value;
    const hours = isWarning ? 0 : parseInt(document.getElementById('penaltyHours').value);
    const status = isWarning ? 'pending' : document.getElementById('penaltyStatus').value;
    const deadline = isWarning ? null : document.getElementById('penaltyDeadline').value;
    
    // Validation - only require student and violation
    if (!studentId || !violation) {
        showErrorToast('Please select a student and violation', 'Missing Fields');
        return;
    }
    
    // For non-warning, validate required fields
    if (!isWarning) {
        if (!serviceType) {
            showErrorToast('Please select a service type', 'Missing Fields');
            return;
        }
        if (!hours || hours <= 0) {
            showErrorToast('Please enter valid hours', 'Missing Fields');
            return;
        }
        if (!deadline) {
            showErrorToast('Please select a deadline', 'Missing Fields');
            return;
        }
    }
    
    const penaltyData = {
        student_id: studentId,
        student_name: studentName || 'Unknown Student',
        violation: violation,
        offense_level: offenseLevel,
        is_warning: isWarning,
        service_type: serviceType,
        hours: hours,
        status: status,
        deadline: deadline,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (penaltyId) {
            const { error } = await supabase
                .from('penalties')
                .update(penaltyData)
                .eq('id', penaltyId);
            if (error) throw error;
            
            showSuccessToast(`Penalty updated for ${studentName || studentId}!`, 'Updated');
        } else {
            penaltyData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('penalties')
                .insert([penaltyData]);
            if (error) throw error;
            
            // Show appropriate message based on offense type
            if (isWarning) {
                showSuccessToast(`Warning issued to ${studentName || studentId}!`, 'Warning Issued');
            } else {
                showSuccessToast(`Penalty added for ${studentName || studentId}!`, 'Penalty Added');
            }
        }
        
        closeModal();
        loadPenalties();
        clearStudentSelection();
        
    } catch (error) {
        console.error('Error saving penalty:', error);
        showErrorToast('Failed to save: ' + error.message, 'Error');
    }
}

async function editPenalty(id) {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('modalTitle').textContent = 'Edit Penalty';
        document.getElementById('penaltyId').value = data.id;
        document.getElementById('penaltyViolation').value = data.violation || '';
        document.getElementById('penaltyServiceType').value = data.service_type || '';
        document.getElementById('penaltyHours').value = data.hours || 0;
        document.getElementById('penaltyStatus').value = data.status || 'pending';
        document.getElementById('penaltyDeadline').value = data.deadline || '';
        
        // Set offense level in hidden input
        const offenseLevel = data.offense_level || '1st Offense';
        const offenseLevelInput = document.getElementById('offenseLevel');
        if (offenseLevelInput) offenseLevelInput.value = offenseLevel;
        
        // Trigger the offense level button to update UI
        let offenseBtnClass = '';
        if (offenseLevel === '1st Offense') offenseBtnClass = 'first-offense';
        else if (offenseLevel === '2nd Offense') offenseBtnClass = 'second-offense';
        else if (offenseLevel === '3rd Offense') offenseBtnClass = 'third-offense';
        
        const offenseBtn = document.querySelector(`.offense-btn.${offenseBtnClass}`);
        if (offenseBtn) offenseBtn.click();
        
        if (data.student_id) {
            document.getElementById('penaltyStudentId').value = data.student_id;
            document.getElementById('penaltyStudentName').value = data.student_name || '';
            
            const selectedInfo = document.getElementById('selectedStudentInfo');
            const selectedDetails = document.getElementById('selectedStudentDetails');
            const searchInput = document.getElementById('studentSearchInput');
            
            if (selectedDetails && data.student_name) {
                selectedDetails.innerHTML = `
                    <strong>${escapeHtml(data.student_name)}</strong><br>
                    <small>ID: ${escapeHtml(data.student_id)}</small>
                `;
                if (selectedInfo) selectedInfo.classList.add('show');
            }
            if (searchInput) searchInput.value = data.student_name || data.student_id;
        }
        
        const manualGroup = document.getElementById('manualEntryGroup');
        if (manualGroup) manualGroup.style.display = 'none';
        
        openModal();
        
    } catch (error) {
        console.error('Error loading penalty:', error);
        showErrorToast('Failed to load penalty data', 'Error');
    }
}

async function deletePenalty(id) {
    if (!confirm('Are you sure you want to delete this penalty?')) return;
    
    try {
        const { error } = await supabase
            .from('penalties')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showSuccessToast('Penalty deleted successfully!', 'Deleted');
        loadPenalties();
        
    } catch (error) {
        console.error('Error deleting penalty:', error);
        showErrorToast('Failed to delete penalty', 'Error');
    }
}

// ============ MODAL CONTROLS ============
function openModal() {
    const modal = document.getElementById('penaltyModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('penaltyModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('penaltyForm').reset();
        document.getElementById('penaltyId').value = '';
        document.getElementById('modalTitle').textContent = 'Add New Penalty';
        clearStudentSelection();
        document.getElementById('manualEntryGroup').style.display = 'none';
        const toggleManualBtn = document.getElementById('toggleManualEntry');
        if (toggleManualBtn) toggleManualBtn.textContent = '📝 Enter Student ID Manually';
    }
}

// ============ SELECT ALL CHECKBOXES ============
function initSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    
    selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.penalty-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
}

function getSelectedPenaltyIds() {
    return Array.from(document.querySelectorAll('.penalty-checkbox:checked'))
        .map(cb => cb.dataset.id);
}

// ============ DARK MODE ============
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedMode = localStorage.getItem('docst_dark_mode');
    
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            showInfoToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'Display', 1500);
        });
    }
}

// ============ NOTIFICATION BUTTON ============
const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        showInfoToast('You have ' + unreadNotifications.length + ' unread notifications', 'Notifications', 3000);
    });
}

// ============ TOAST STYLES ============
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .toast-container {
            position: fixed;
            top: 80px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 380px;
            pointer-events: none;
        }
        
        @media (max-width: 768px) {
            .toast-container {
                top: 70px;
                right: 16px;
                left: 16px;
                max-width: none;
            }
        }
        
        .toast {
            background: white;
            border-radius: 16px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
            pointer-events: auto;
            cursor: pointer;
            animation: toastSlideIn 0.3s ease forwards;
            border-left: 4px solid;
        }
        
        .toast-success {
            border-left-color: #10b981;
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }
        .toast-success .toast-icon { background: #10b981; color: white; }
        
        .toast-error {
            border-left-color: #ef4444;
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
        }
        .toast-error .toast-icon { background: #ef4444; color: white; }
        
        .toast-warning {
            border-left-color: #f59e0b;
            background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
        }
        .toast-warning .toast-icon { background: #f59e0b; color: white; }
        
        .toast-info {
            border-left-color: #3b82f6;
            background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
        }
        .toast-info .toast-icon { background: #3b82f6; color: white; }
        
        .toast-icon {
            width: 28px;
            height: 28px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-title {
            font-weight: 700;
            font-size: 13px;
            margin-bottom: 2px;
            color: #1f2937;
        }
        
        .toast-message {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .toast-close {
            background: none;
            border: none;
            font-size: 12px;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            flex-shrink: 0;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .toast-close:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #6b7280;
        }
        
        @keyframes toastSlideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes toastSlideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
        
        .toast-removing {
            animation: toastSlideOut 0.25s ease forwards;
        }
        
        body.dark-mode .toast {
            background: #1e293b;
        }
        
        body.dark-mode .toast-title {
            color: #f1f5f9;
        }
        
        body.dark-mode .toast-message {
            color: #94a3b8;
        }
        
        body.dark-mode .toast-success {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 100%);
        }
        
        body.dark-mode .toast-error {
            background: linear-gradient(135deg, #1e293b 0%, #7f1d1d 100%);
        }
        
        body.dark-mode .toast-warning {
            background: linear-gradient(135deg, #1e293b 0%, #78350f 100%);
        }
        
        body.dark-mode .toast-info {
            background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%);
        }
        
        body.dark-mode .toast-close {
            color: #64748b;
        }
        
        body.dark-mode .toast-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #94a3b8;
        }
    `;
    document.head.appendChild(style);
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Penalties Page...');
    await getCurrentAdminInfo();
    initDarkMode();
    await loadStudentsList();
    await loadPenalties();
    setupStudentSearch();
    setupQuickAddModal();
    initSelectAll();
    startNotificationPolling();

    const addPenaltyBtn = document.getElementById('addPenaltyBtn');
    const editPenaltyBtn = document.getElementById('editPenaltyBtn');
    const deletePenaltyBtn = document.getElementById('deletePenaltyBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const penaltyModal = document.getElementById('penaltyModal');
    const penaltyForm = document.getElementById('penaltyForm');

    if (addPenaltyBtn) {
        addPenaltyBtn.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = 'Add New Penalty';
            document.getElementById('penaltyId').value = '';
            document.getElementById('penaltyForm').reset();
            clearStudentSelection();
            document.getElementById('manualEntryGroup').style.display = 'none';
            const toggleManualBtn = document.getElementById('toggleManualEntry');
            if (toggleManualBtn) toggleManualBtn.textContent = '📝 Enter Student ID Manually';
            openModal();
        });
    }

    if (editPenaltyBtn) {
        editPenaltyBtn.addEventListener('click', () => {
            const selected = getSelectedPenaltyIds();
            if (selected.length !== 1) {
                showErrorToast('Please select exactly one penalty to edit', 'Selection Required');
                return;
            }
            editPenalty(selected[0]);
        });
    }

    if (deletePenaltyBtn) {
        deletePenaltyBtn.addEventListener('click', async () => {
            const selected = getSelectedPenaltyIds();
            if (selected.length === 0) {
                showErrorToast('Please select at least one penalty to delete', 'Selection Required');
                return;
            }
            if (confirm(`Delete ${selected.length} penalty(ies)?`)) {
                for (const id of selected) {
                    await deletePenalty(id);
                }
                loadPenalties();
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    if (penaltyModal) {
        penaltyModal.addEventListener('click', (e) => {
            if (e.target === penaltyModal) closeModal();
        });
    }
    
    if (penaltyForm) penaltyForm.addEventListener('submit', savePenalty);
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    
    if (hamburgerBtn && drawer && overlay) {
        hamburgerBtn.addEventListener('click', () => {
            drawer.classList.add('open');
            overlay.classList.add('open');
            document.body.classList.add('drawer-open');
        });
        
        overlay.addEventListener('click', () => {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            document.body.classList.remove('drawer-open');
        });
    }
    
    console.log('Penalties Page Initialized');
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}