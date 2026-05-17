import { createClient } from '@supabase/supabase-js'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin, showLogoutConfirmation } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let students = [];
let editingStudentId = null;
let currentAdmin = null;
let searchTerm = '';

// ============ TOAST NOTIFICATION SYSTEM ============
let toastContainer = null;

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
let unreadNotifications = [];
let notificationInterval = null;
let notificationBadge = null;

async function fetchNotifications() {
    try {
        const admin = getCurrentAdmin();
        if (!admin) return [];
        
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`admin_id.eq.${admin.admin_id},admin_id.is.null`)
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
        const admin = getCurrentAdmin();
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .or(`admin_id.eq.${admin.admin_id},admin_id.is.null`)
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
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                z-index: 10001;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            .notification-panel.show { transform: translateX(0); }
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                background: linear-gradient(135deg, #2563EB, #1D4ED8);
                color: white;
            }
            .notification-header h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
            .clear-all-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
            }
            .clear-all-btn:hover { background: rgba(255,255,255,0.3); }
            .close-panel-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
            }
            .close-panel-btn:hover { background: rgba(255,255,255,0.2); }
            .notification-list { max-height: 400px; overflow-y: auto; }
            .notification-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
                cursor: pointer;
                transition: background 0.2s;
            }
            .notification-item:hover { background: #f9fafb; }
            .notification-item.success { border-left: 3px solid #10b981; }
            .notification-item.error { border-left: 3px solid #ef4444; }
            .notification-item.warning { border-left: 3px solid #f59e0b; }
            .notification-item.info { border-left: 3px solid #3b82f6; }
            .notification-icon {
                width: 36px;
                height: 36px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .notification-item.success .notification-icon { background: #d1fae5; color: #10b981; }
            .notification-item.error .notification-icon { background: #fee2e2; color: #ef4444; }
            .notification-item.warning .notification-icon { background: #fed7aa; color: #f59e0b; }
            .notification-item.info .notification-icon { background: #dbeafe; color: #3b82f6; }
            .notification-details { flex: 1; }
            .notification-title { font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px; }
            .notification-message { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
            .notification-time { font-size: 11px; color: #9ca3af; }
            .mark-read-btn {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 6px;
                border-radius: 8px;
            }
            .mark-read-btn:hover { background: #e5e7eb; color: #10b981; }
            .empty-notifications { text-align: center; padding: 40px 20px; color: #9ca3af; }
            .empty-notifications i { font-size: 48px; margin-bottom: 12px; }
            .loading-notifications { text-align: center; padding: 40px; color: #9ca3af; }
            body.dark-mode .notification-panel { background: #1f2937; }
            body.dark-mode .notification-item { border-bottom-color: #374151; }
            body.dark-mode .notification-item:hover { background: #374151; }
            body.dark-mode .notification-title { color: #f3f4f6; }
            body.dark-mode .notification-message { color: #9ca3af; }
            @media (max-width: 480px) {
                .notification-panel { top: 60px; right: 10px; left: 10px; width: auto; }
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

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
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

async function createStudentNotification(studentName, action) {
    const admin = getCurrentAdmin();
    if (!admin) return;
    
    const title = action === 'add' ? 'Student Added' : 'Student Deleted';
    const message = action === 'add' 
        ? `${studentName} has been added to the system.`
        : `${studentName} has been removed from the system.`;
    const type = action === 'add' ? 'success' : 'warning';
    
    const { error } = await supabase
        .from('notifications')
        .insert({
            admin_id: admin.admin_id,
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

// ============ DARK MODE ============
function updateDarkModeIcon(btn, isDark) {
    if (!btn) return;
    if (isDark) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
        `;
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;
    }
}

function setupDarkModeToggle() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (!darkModeBtn) return;
    
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(darkModeBtn, true);
    } else {
        updateDarkModeIcon(darkModeBtn, false);
    }
    
    darkModeBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        const nowDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
        updateDarkModeIcon(darkModeBtn, nowDark);
        showInfoToast(nowDark ? 'Dark mode enabled' : 'Light mode enabled', 'Display', 2000);
    };
}

function updateDrawerWithAdminName(adminName, adminId) {
    const drawerNameEl = document.getElementById('drawerAdminName');
    const drawerIdEl = document.getElementById('drawerAdminId');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (drawerNameEl) drawerNameEl.textContent = adminName;
    if (drawerIdEl) drawerIdEl.textContent = adminId || 'Admin';
    if (avatarInitials && adminName) {
        const initials = getInitialsFromName(adminName);
        avatarInitials.textContent = initials;
    }
}

function getInitialsFromName(fullName) {
    if (!fullName) return 'AD';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadAdminProfile() {
    try {
        const admin = getCurrentAdmin();
        if (admin && (admin.full_name || admin.name)) {
            currentAdmin = admin;
            const adminName = admin.full_name || admin.name;
            updateDrawerWithAdminName(adminName, admin.admin_id || 'Admin');
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            const { data: adminData, error } = await supabase
                .from('admins')
                .select('full_name, name, email, role, admin_id')
                .eq('email', user.email)
                .maybeSingle();
            
            if (adminData) {
                const adminName = adminData.full_name || adminData.name || user.email.split('@')[0];
                currentAdmin = {
                    full_name: adminName,
                    name: adminName,
                    email: adminData.email,
                    role: adminData.role,
                    admin_id: adminData.admin_id
                };
                localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
                updateDrawerWithAdminName(adminName, adminData.admin_id || 'Admin');
            } else {
                const emailName = user.email.split('@')[0];
                updateDrawerWithAdminName(emailName, 'Admin');
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
    }
}

// ============ LOAD STUDENTS ============
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        students = data?.map(s => ({
            id: s.id,
            name: s.name,
            idNumber: s.id_number || s.id,
            email: s.email,
            status: s.status || 'active',
            created_at: s.created_at
        })) || [];
        
        renderStudents();
        updateStats();
        
    } catch (error) {
        console.error('Error loading students:', error);
        students = [];
        renderStudents();
        updateStats();
        showErrorToast('Failed to load students: ' + error.message);
    }
}

function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><div class="empty-icon">👨‍🎓</div><div class="empty-title">No students yet</div><div>Click "Add Student" to enroll</div></td></td>`;
        return;
    }
    
    let filtered = students;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = students.filter(s => 
            s.name?.toLowerCase().includes(term) ||
            s.idNumber?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term)
        );
    }
    
    tbody.innerHTML = filtered.map(student => {
        const fullName = student.name || 'Unknown';
        const initials = getInitials(fullName);
        
        return `
        <tr data-id="${student.id}">
            <td>
                <div class="student-cell">
                    <div class="student-avatar">${initials}</div>
                    <div>
                        <div class="student-name">${escapeHtml(fullName)}</div>
                        <div class="student-id-small">${escapeHtml(student.idNumber)}</div>
                    </div>
                </div>
            </td>
            <td><span class="id-badge">${escapeHtml(student.idNumber)}</span></td>
            <td>
                <div class="email-cell">
                    <i class="fas fa-envelope"></i>
                    <span class="email-badge">${escapeHtml(student.email)}</span>
                </div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="delete-student" data-id="${student.id}" data-name="${escapeHtml(fullName)}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
    
    document.querySelectorAll('.delete-student').forEach(btn => {
        btn.onclick = () => deleteStudent(btn.dataset.id, btn.dataset.name);
    });
}

function getInitials(fullName) {
    if (!fullName) return '??';
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function updateStats() {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const verified = students.filter(s => s.email?.endsWith('@gordoncollege.edu.ph')).length;
    
    const totalEl = document.getElementById('totalStudents');
    const activeEl = document.getElementById('activeStudents');
    const verifiedEl = document.getElementById('verifiedEmails');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (verifiedEl) verifiedEl.textContent = verified;
}

async function deleteStudent(id, studentName) {
    const confirmed = confirm(`Are you sure you want to delete "${studentName}"? This action cannot be undone.`);
    
    if (!confirmed) {
        showInfoToast(`${studentName} was not deleted`, 'Cancelled', 2000);
        return;
    }
    
    showWarningToast(`Deleting ${studentName}...`, 'Please Wait', 2000);
    
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        students = students.filter(s => s.id != id);
        renderStudents();
        updateStats();
        await createStudentNotification(studentName, 'delete');
        showSuccessToast(`${studentName} has been successfully removed.`, 'Student Deleted', 4000);
        
    } catch (error) {
        showErrorToast(`Error deleting ${studentName}. Please try again.`, 'Delete Error');
        console.error('Delete error:', error);
    }
}

async function saveStudent(studentData, isEdit = false) {
    try {
        if (isEdit && editingStudentId) {
            const { error } = await supabase
                .from('students')
                .update({
                    name: studentData.name,
                    email: studentData.email,
                    status: studentData.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingStudentId);
            
            if (error) throw error;
            showSuccessToast('Student updated successfully!');
        } else {
            const { error } = await supabase
                .from('students')
                .insert([{
                    id: studentData.idNumber,
                    name: studentData.name,
                    email: studentData.email,
                    status: studentData.status,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            await createStudentNotification(studentData.name, 'add');
            showSuccessToast('Student added successfully!');
        }
        
        await loadStudents();
        closeModal();
    } catch (error) {
        console.error('Error saving student:', error);
        showErrorToast('Failed to save student: ' + error.message);
    }
}

const studentForm = document.getElementById('studentForm');
if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentData = {
            name: document.getElementById('studentName')?.value.trim() || '',
            idNumber: document.getElementById('studentIdNumber')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            status: document.getElementById('studentStatus')?.value || 'active'
        };
        
        if (!studentData.name || !studentData.idNumber || !studentData.email) {
            showErrorToast('Please fill in all fields');
            return;
        }
        
        if (!studentData.email.endsWith('@gordoncollege.edu.ph')) {
            showErrorToast('Email must end with @gordoncollege.edu.ph');
            return;
        }
        
        const existingId = document.getElementById('studentId')?.value;
        
        if (existingId) {
            editingStudentId = existingId;
            await saveStudent(studentData, true);
        } else {
            await saveStudent(studentData, false);
        }
    });
}

function openModal() { 
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.remove('open');
    const form = document.getElementById('studentForm');
    if (form) form.reset();
    document.getElementById('studentId').value = '';
    editingStudentId = null;
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.body.style.overflow = '';
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderStudents();
    });
}

const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        showNotificationPanel();
    });
}

// ============ ADD BUTTON ============
const addBtn = document.getElementById('addStudentBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const studentModal = document.getElementById('studentModal');

if (addBtn) addBtn.addEventListener('click', openModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (studentModal) {
    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) closeModal();
    });
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Student Management...');
    
    await loadAdminProfile();
    
    const admin = getCurrentAdmin();
    const adminName = admin?.full_name || admin?.name || 'Administrator';
    const adminId = admin?.admin_id || 'Admin';
    
    setupAdminDrawer(adminName, adminId);
    setupAdminLogout('logoutBtn');
    setupAdminDrawerControls();
    
    setupDarkModeToggle();
    await loadStudents();
    startNotificationPolling();
}

init();