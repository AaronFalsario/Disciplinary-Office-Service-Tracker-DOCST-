import { initAdminDrawer } from '../../drawer-admin.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ INITIALIZE DRAWER ============
initAdminDrawer();

// ============ TOAST NOTIFICATION SYSTEM ============
let toastContainer = null;
let currentAdmin = null;
let unreadNotifications = [];
let notificationInterval = null;
let notificationBadge = null;
let studentsList = [];

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

// ============ SYNCHRONIZED NOTIFICATION SYSTEM ============
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
            notificationBadge.style.cssText = `
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                font-size: 10px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 20px;
                min-width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: monospace;
            `;
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

function showNotificationToast(notification) {
    const type = notification.type || 'info';
    const title = notification.title || 'New Notification';
    const message = notification.message || '';
    
    showToast(message, type, title, 5000);
}

async function checkNewNotifications() {
    const previousCount = unreadNotifications.length;
    await fetchNotifications();
    
    if (unreadNotifications.length > previousCount) {
        const newNotifications = unreadNotifications.slice(0, unreadNotifications.length - previousCount);
        newNotifications.forEach(notif => {
            showNotificationToast(notif);
        });
    }
}

function startNotificationPolling() {
    if (notificationInterval) clearInterval(notificationInterval);
    
    fetchNotifications();
    
    notificationInterval = setInterval(() => {
        checkNewNotifications();
    }, 30000);
}

async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        unreadNotifications = unreadNotifications.filter(n => n.id !== notificationId);
        updateNotificationBadge();
        
        showSuccessToast('Notification marked as read', 'Updated');
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    if (unreadNotifications.length === 0) return;
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .or(`admin_id.eq.${currentAdmin?.admin_id},admin_id.is.null`)
            .eq('is_read', false);
        
        if (error) throw error;
        
        unreadNotifications = [];
        updateNotificationBadge();
        showSuccessToast('All notifications marked as read', 'Cleared');
    } catch (error) {
        console.error('Error marking all as read:', error);
        showErrorToast('Failed to clear notifications', 'Error');
    }
}

function formatRelativeTime(date) {
    const diffMins = Math.floor((Date.now() - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

async function renderNotificationList() {
    const listContainer = document.getElementById('notificationList');
    if (!listContainer) return;
    
    await fetchNotifications();
    
    if (unreadNotifications.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = unreadNotifications.map(notif => `
        <div class="notification-item ${notif.type}" data-id="${notif.id}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-details">
                <div class="notification-title">${escapeHtml(notif.title || 'Notification')}</div>
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">${formatRelativeTime(new Date(notif.created_at))}</div>
            </div>
            <button class="mark-read-btn" data-id="${notif.id}">
                <i class="fas fa-check"></i>
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            await markNotificationAsRead(id);
            renderNotificationList();
        });
    });
    
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (!e.target.closest('.mark-read-btn')) {
                const id = item.dataset.id;
                await markNotificationAsRead(id);
                renderNotificationList();
            }
        });
    });
}

function showNotificationPanel() {
    let panel = document.getElementById('notificationPanel');
    
    if (!document.getElementById('notificationPanelStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationPanelStyles';
        style.textContent = `
            .notification-panel {
                position: fixed;
                top: 70px;
                right: 20px;
                width: 380px;
                max-width: calc(100vw - 40px);
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            
            .notification-panel.show {
                transform: translateX(0);
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                background: linear-gradient(135deg, #2563EB, #1D4ED8);
                color: white;
            }
            
            .notification-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .clear-all-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .clear-all-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .close-panel-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: background 0.2s;
            }
            
            .close-panel-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .notification-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .notification-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .notification-item:hover {
                background: #f9fafb;
            }
            
            .notification-item.success {
                border-left: 3px solid #10b981;
            }
            .notification-item.error {
                border-left: 3px solid #ef4444;
            }
            .notification-item.warning {
                border-left: 3px solid #f59e0b;
            }
            .notification-item.info {
                border-left: 3px solid #3b82f6;
            }
            
            .notification-icon {
                width: 36px;
                height: 36px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .notification-item.success .notification-icon {
                background: #d1fae5;
                color: #10b981;
            }
            .notification-item.error .notification-icon {
                background: #fee2e2;
                color: #ef4444;
            }
            .notification-item.warning .notification-icon {
                background: #fed7aa;
                color: #f59e0b;
            }
            .notification-item.info .notification-icon {
                background: #dbeafe;
                color: #3b82f6;
            }
            
            .notification-details {
                flex: 1;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 4px;
            }
            
            .notification-message {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 4px;
            }
            
            .notification-time {
                font-size: 11px;
                color: #9ca3af;
            }
            
            .mark-read-btn {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 6px;
                border-radius: 8px;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            
            .mark-read-btn:hover {
                background: #e5e7eb;
                color: #10b981;
            }
            
            .empty-notifications {
                text-align: center;
                padding: 40px 20px;
                color: #9ca3af;
            }
            
            .empty-notifications i {
                font-size: 48px;
                margin-bottom: 12px;
            }
            
            .loading-notifications {
                text-align: center;
                padding: 40px;
                color: #9ca3af;
            }
            
            body.dark-mode .notification-panel {
                background: #1f2937;
            }
            
            body.dark-mode .notification-item {
                border-bottom-color: #374151;
            }
            
            body.dark-mode .notification-item:hover {
                background: #374151;
            }
            
            body.dark-mode .notification-title {
                color: #f3f4f6;
            }
            
            body.dark-mode .notification-message {
                color: #9ca3af;
            }
            
            body.dark-mode .empty-notifications {
                color: #6b7280;
            }
            
            @media (max-width: 480px) {
                .notification-panel {
                    top: 60px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notificationPanel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <h3><i class="fas fa-bell"></i> Notifications</h3>
                <button id="clearAllNotifications" class="clear-all-btn">Clear All</button>
                <button id="closeNotificationPanel" class="close-panel-btn">&times;</button>
            </div>
            <div class="notification-list" id="notificationList">
                <div class="loading-notifications">Loading...</div>
            </div>
        `;
        document.body.appendChild(panel);
        
        document.getElementById('closeNotificationPanel')?.addEventListener('click', () => {
            panel.classList.remove('show');
        });
        
        document.getElementById('clearAllNotifications')?.addEventListener('click', () => {
            markAllNotificationsAsRead();
            renderNotificationList();
        });
        
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('show') && 
                !panel.contains(e.target) && 
                !e.target.closest('#notifyBtn')) {
                panel.classList.remove('show');
            }
        });
    }
    
    renderNotificationList();
    panel.classList.add('show');
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

// ============ ENHANCED STUDENT SELECTOR ============
function setupStudentSelector() {
    const studentSelect = document.getElementById('penaltyStudentSelect');
    const manualEntryGroup = document.getElementById('manualEntryGroup');
    const toggleManualBtn = document.getElementById('toggleManualEntry');
    const studentIdInput = document.getElementById('penaltyStudentId');
    const studentNameDisplay = document.getElementById('selectedStudentName');
    
    if (!studentSelect) return;
    
    // Populate dropdown with students
    studentSelect.innerHTML = '<option value="">-- Select a student --</option>';
    studentsList.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.id})`;
        option.dataset.name = student.name;
        studentSelect.appendChild(option);
    });
    
    // Handle selection change
    studentSelect.addEventListener('change', () => {
        const selectedOption = studentSelect.options[studentSelect.selectedIndex];
        if (studentSelect.value) {
            studentIdInput.value = studentSelect.value;
            if (studentNameDisplay) {
                studentNameDisplay.textContent = `Selected: ${selectedOption.textContent}`;
                studentNameDisplay.style.display = 'block';
            }
            manualEntryGroup.style.display = 'none';
            toggleManualBtn.textContent = '📝 Enter Manually';
        } else {
            studentIdInput.value = '';
            if (studentNameDisplay) studentNameDisplay.style.display = 'none';
        }
    });
    
    // Toggle manual entry
    if (toggleManualBtn) {
        toggleManualBtn.addEventListener('click', () => {
            if (manualEntryGroup.style.display === 'none' || manualEntryGroup.style.display === '') {
                manualEntryGroup.style.display = 'block';
                toggleManualBtn.textContent = '📋 Select from List';
                studentSelect.value = '';
                studentIdInput.value = '';
                if (studentNameDisplay) studentNameDisplay.style.display = 'none';
            } else {
                manualEntryGroup.style.display = 'none';
                toggleManualBtn.textContent = '📝 Enter Manually';
                if (studentSelect.value) {
                    studentIdInput.value = studentSelect.value;
                }
            }
        });
    }
    
    // Add quick add button for unregistered students
    const quickAddBtn = document.getElementById('quickAddStudent');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            openQuickAddStudentModal();
        });
    }
}

// ============ QUICK ADD STUDENT MODAL ============
function openQuickAddStudentModal() {
    let modal = document.getElementById('quickAddStudentModal');
    
    if (!modal) {
        const style = document.createElement('style');
        style.textContent = `
            .quick-add-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            
            .quick-add-content {
                background: white;
                border-radius: 24px;
                padding: 28px;
                max-width: 450px;
                width: 90%;
                animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            
            body.dark-mode .quick-add-content {
                background: #1e293b;
            }
            
            .quick-add-content h3 {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 20px;
                color: #1e293b;
            }
            
            body.dark-mode .quick-add-content h3 {
                color: #f1f5f9;
            }
            
            .quick-add-content .form-group {
                margin-bottom: 16px;
            }
            
            .quick-add-content label {
                display: block;
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 6px;
                color: #475569;
            }
            
            body.dark-mode .quick-add-content label {
                color: #cbd5e1;
            }
            
            .quick-add-content input {
                width: 100%;
                padding: 10px 14px;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                font-size: 14px;
                background: #f8fafc;
            }
            
            body.dark-mode .quick-add-content input {
                background: #0f172a;
                border-color: #334155;
                color: #f1f5f9;
            }
            
            .quick-add-buttons {
                display: flex;
                gap: 12px;
                margin-top: 20px;
            }
            
            .quick-add-buttons button {
                flex: 1;
                padding: 12px;
                border-radius: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .quick-add-cancel {
                background: #e2e8f0;
                border: none;
                color: #475569;
            }
            
            .quick-add-cancel:hover {
                background: #cbd5e1;
            }
            
            .quick-add-submit {
                background: linear-gradient(135deg, #2563EB, #1D4ED8);
                border: none;
                color: white;
            }
            
            .quick-add-submit:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            }
            
            body.dark-mode .quick-add-cancel {
                background: #334155;
                color: #cbd5e1;
            }
        `;
        document.head.appendChild(style);
        
        modal = document.createElement('div');
        modal.id = 'quickAddStudentModal';
        modal.className = 'quick-add-modal';
        modal.innerHTML = `
            <div class="quick-add-content">
                <h3><i class="fas fa-user-plus"></i> Quick Add Student</h3>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="quickStudentName" placeholder="e.g., Juan Dela Cruz">
                </div>
                <div class="form-group">
                    <label>Student ID Number</label>
                    <input type="text" id="quickStudentId" placeholder="e.g., 2024-00123">
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="quickStudentEmail" placeholder="student.name@gordoncollege.edu.ph">
                </div>
                <div class="quick-add-buttons">
                    <button class="quick-add-cancel">Cancel</button>
                    <button class="quick-add-submit">Add & Select</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.quick-add-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.quick-add-submit').addEventListener('click', async () => {
            await quickAddStudent();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    modal.style.display = 'flex';
}

async function quickAddStudent() {
    const name = document.getElementById('quickStudentName')?.value.trim();
    const studentId = document.getElementById('quickStudentId')?.value.trim();
    const email = document.getElementById('quickStudentEmail')?.value.trim();
    
    if (!name || !studentId || !email) {
        showErrorToast('Please fill all fields', 'Missing Information');
        return;
    }
    
    if (!email.endsWith('@gordoncollege.edu.ph')) {
        showErrorToast('Email must end with @gordoncollege.edu.ph', 'Invalid Email');
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
        
        // Close modal
        const modal = document.getElementById('quickAddStudentModal');
        if (modal) modal.remove();
        
        // Reload students list and update selector
        await loadStudentsList();
        setupStudentSelector();
        
        // Auto-select the newly added student
        const studentSelect = document.getElementById('penaltyStudentSelect');
        if (studentSelect) {
            studentSelect.value = studentId;
            const event = new Event('change');
            studentSelect.dispatchEvent(event);
        }
        
    } catch (error) {
        console.error('Error adding student:', error);
        showErrorToast('Failed to add student. ID might already exist.', 'Error');
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

function displayPenalties(penalties) {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No penalties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = penalties.map(penalty => `
        <tr data-id="${penalty.id}">
            <td style="text-align: center;"><input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}"></td>
            <td><strong>${escapeHtml(penalty.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(penalty.violation || 'N/A')}</td>
            <td>${escapeHtml(penalty.service_type || 'N/A')}</td>
            <td>${penalty.hours || 0} hrs</td>
            <td><span class="status-badge status-${penalty.status || 'pending'}">${penalty.status || 'pending'}</span></td>
            <td>${penalty.deadline ? new Date(penalty.deadline).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="edit-penalty-btn" data-id="${penalty.id}" style="background: none; border: none; cursor: pointer; margin-right: 8px;">
                    <i class="fas fa-edit" style="color: var(--blue);"></i>
                </button>
                <button class="delete-penalty-btn" data-id="${penalty.id}" style="background: none; border: none; cursor: pointer;">
                    <i class="fas fa-trash" style="color: var(--red);"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
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
    
    if (totalStudents) totalStudents.textContent = penalties.length;
    if (totalPenalties) totalPenalties.textContent = penalties.length;
    
    const pending = penalties.filter(p => p.status === 'pending').length;
    if (pendingCases) pendingCases.textContent = pending;
    
    const completed = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.hours || 0), 0);
    if (completedHours) completedHours.textContent = completed;
}

// ============ SAVE PENALTY ============
async function savePenalty(event) {
    event.preventDefault();
    
    const penaltyId = document.getElementById('penaltyId').value;
    const studentId = document.getElementById('penaltyStudentId').value.trim();
    const violation = document.getElementById('penaltyViolation').value;
    const serviceType = document.getElementById('penaltyServiceType').value;
    const hours = parseInt(document.getElementById('penaltyHours').value);
    const status = document.getElementById('penaltyStatus').value;
    const deadline = document.getElementById('penaltyDeadline').value;
    
    if (!studentId || !violation || !serviceType || !hours || !deadline) {
        showErrorToast('Please fill all required fields', 'Missing Fields');
        return;
    }
    
    const penaltyData = {
        student_id: studentId,
        violation: violation,
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
            
            await createPenaltyNotification({ student_id: studentId, violation: violation, status: status }, 'update');
            showSuccessToast('Penalty updated successfully!', 'Updated');
        } else {
            penaltyData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('penalties')
                .insert([penaltyData]);
            if (error) throw error;
            
            await createPenaltyNotification({ student_id: studentId, violation: violation, status: status }, 'add');
            showSuccessToast('Penalty added successfully!', 'Added');
        }
        
        closeModal();
        loadPenalties();
        
    } catch (error) {
        console.error('Error saving penalty:', error);
        showErrorToast('Failed to save penalty', 'Error');
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
        document.getElementById('penaltyStudentId').value = data.student_id || '';
        document.getElementById('penaltyViolation').value = data.violation || '';
        document.getElementById('penaltyServiceType').value = data.service_type || '';
        document.getElementById('penaltyHours').value = data.hours || '';
        document.getElementById('penaltyStatus').value = data.status || 'pending';
        document.getElementById('penaltyDeadline').value = data.deadline || '';
        
        // Also update the select dropdown if the student exists
        const studentSelect = document.getElementById('penaltyStudentSelect');
        if (studentSelect) {
            studentSelect.value = data.student_id || '';
            const manualGroup = document.getElementById('manualEntryGroup');
            if (manualGroup) manualGroup.style.display = 'none';
        }
        
        openModal();
        
    } catch (error) {
        console.error('Error loading penalty:', error);
        showErrorToast('Failed to load penalty data', 'Error');
    }
}

async function deletePenalty(id) {
    if (!confirm('Are you sure you want to delete this penalty?')) return;
    
    try {
        const { data: penaltyData, error: fetchError } = await supabase
            .from('penalties')
            .select('student_id, violation')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('penalties')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        if (penaltyData) {
            await createPenaltyNotification(penaltyData, 'delete');
        }
        
        showSuccessToast('Penalty deleted successfully!', 'Deleted');
        loadPenalties();
        
    } catch (error) {
        console.error('Error deleting penalty:', error);
        showErrorToast('Failed to delete penalty', 'Error');
    }
}

async function createPenaltyNotification(penaltyData, action) {
    if (!currentAdmin && !(await getCurrentAdminInfo())) return;
    
    let title = '';
    let message = '';
    let type = 'info';
    
    switch(action) {
        case 'add':
            title = 'Penalty Added';
            message = `A new penalty has been issued to ${penaltyData.student_id} for ${penaltyData.violation}.`;
            type = 'warning';
            break;
        case 'update':
            title = 'Penalty Updated';
            message = `Penalty for ${penaltyData.student_id} has been updated. Status: ${penaltyData.status}.`;
            type = 'info';
            break;
        case 'delete':
            title = 'Penalty Deleted';
            message = `A penalty record has been removed from the system.`;
            type = 'error';
            break;
        default:
            return;
    }
    
    const { error } = await supabase
        .from('notifications')
        .insert({
            admin_id: currentAdmin?.admin_id,
            title: title,
            message: message,
            type: type,
            is_read: false,
            created_at: new Date().toISOString()
        });
    
    if (error) {
        console.error('Error creating notification:', error);
    } else {
        fetchNotifications();
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
        document.getElementById('selectedStudentName').style.display = 'none';
    }
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

// ============ SELECT ALL ============
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

// ============ NOTIFICATION BUTTON ============
const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        showNotificationPanel();
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
    setupStudentSelector();
    initSelectAll();
    startNotificationPolling();

    const addPenaltyBtn = document.getElementById('addPenaltyBtn');
    const editPenaltyBtn = document.getElementById('editPenaltyBtn');
    const deletePenaltyBtn = document.getElementById('deletePenaltyBtn');
    const communityServiceBtn = document.getElementById('communityServiceBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const penaltyModal = document.getElementById('penaltyModal');
    const penaltyForm = document.getElementById('penaltyForm');

    if (addPenaltyBtn) {
        addPenaltyBtn.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = 'Add New Penalty';
            document.getElementById('penaltyId').value = '';
            document.getElementById('penaltyForm').reset();
            document.getElementById('selectedStudentName').style.display = 'none';
            document.getElementById('penaltyStudentSelect').value = '';
            document.getElementById('manualEntryGroup').style.display = 'none';
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

    if (communityServiceBtn) {
        communityServiceBtn.addEventListener('click', () => {
            window.location.href = 'community-service.html';
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    if (penaltyModal) {
        penaltyModal.addEventListener('click', (e) => {
            if (e.target === penaltyModal) closeModal();
        });
    }
    
    if (penaltyForm) penaltyForm.addEventListener('submit', savePenalty);
    
    console.log('Penalties Page Initialized');
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}