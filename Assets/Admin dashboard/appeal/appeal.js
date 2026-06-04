import { createClient } from '@supabase/supabase-js'
import { initAdminDrawer as initDrawer, getCurrentAdmin, showLogoutConfirmation } from '/Assets/drawer-admin.js';

// ============ REMOVE DRAWER LOADING ANIMATIONS ============
const removeDrawerAnimations = document.createElement('style');
removeDrawerAnimations.textContent = `
    /* Remove all drawer animations - instant loading */
    .drawer {
        transition: none !important;
        transform: translateX(0) !important;
    }
    
    .drawer-overlay {
        transition: none !important;
    }
    
    .drawer-nav-item,
    .drawer-logout,
    .drawer-close {
        transition: none !important;
    }
    
    /* Remove mobile drawer animation */
    @media (max-width: 768px) {
        .drawer {
            transition: none !important;
        }
        .drawer.open {
            transform: translateX(0) !important;
        }
    }
    
    /* Remove hover transform animations */
    .drawer-nav-item:hover,
    .drawer-logout:hover {
        transform: none !important;
        transition: none !important;
    }
    
    /* Remove any fade animations */
    .drawer-overlay {
        transition: none !important;
    }
    
    /* Remove content fade animations */
    .dashboard-main,
    .welcome-section,
    .stat-card,
    .section-hdr,
    .action-buttons-row,
    .table-wrap,
    tbody tr {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
    }
    
    /* Disable all keyframe animations */
    * {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
    }
`;
document.head.appendChild(removeDrawerAnimations);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ TOAST NOTIFICATION SYSTEM ============
let toastContainer = null;
let currentAdmin = null;
let unreadNotifications = [];
let notificationInterval = null;
let notificationBadge = null;
let notificationChannel = null;

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
        case 'success': iconHtml = '<i class="fas fa-check-circle"></i>'; defaultTitle = 'Success'; break;
        case 'error': iconHtml = '<i class="fas fa-times-circle"></i>'; defaultTitle = 'Error'; break;
        case 'warning': iconHtml = '<i class="fas fa-exclamation-triangle"></i>'; defaultTitle = 'Warning'; break;
        default: iconHtml = '<i class="fas fa-info-circle"></i>'; defaultTitle = 'Information'; break;
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
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeToast(toast); });
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) removeToast(toast);
    });
    if (duration > 0) setTimeout(() => { if (toast.parentElement) removeToast(toast); }, duration);
    return toast;
}

function showSuccessToast(message, title = 'Success', duration = 4000) { return showToast(message, 'success', title, duration); }
function showErrorToast(message, title = 'Error', duration = 5000) { return showToast(message, 'error', title, duration); }
function showWarningToast(message, title = 'Warning', duration = 4000) { return showToast(message, 'warning', title, duration); }
function showInfoToast(message, title = 'Information', duration = 3000) { return showToast(message, 'info', title, duration); }

// ============ SYNCHRONIZED NOTIFICATION SYSTEM WITH REAL-TIME ============
async function getCurrentAdminInfo() {
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (storedAdmin) {
        try {
            currentAdmin = JSON.parse(storedAdmin);
            console.log('Admin loaded from localStorage:', currentAdmin);
        } catch(e) {
            console.error('Error parsing admin:', e);
        }
    }
    
    if (!currentAdmin) {
        currentAdmin = getCurrentAdmin();
    }
    
    if (currentAdmin && currentAdmin.admin_id) {
        // Check if admin_id is valid UUID format to avoid 400 error
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUuid = uuidRegex.test(currentAdmin.admin_id);
        
        if (notificationChannel) {
            try {
                notificationChannel.unsubscribe();
            } catch(e) {
                console.warn('Error unsubscribing:', e);
            }
        }
        
        // Only subscribe if admin_id is valid UUID
        if (isValidUuid) {
            notificationChannel = supabase
                .channel('notifications-channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `admin_id=eq.${currentAdmin.admin_id}`
                    },
                    (payload) => {
                        console.log('🔔 New admin notification received:', payload);
                        const newNotification = payload.new;
                        
                        unreadNotifications.unshift(newNotification);
                        updateNotificationBadge();
                        showNotificationToast(newNotification);
                        
                        const panel = document.getElementById('notificationPanel');
                        if (panel && panel.classList.contains('show')) {
                            renderNotificationList();
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Notification subscription status:', status);
                });
        } else {
            console.log('Admin ID is not UUID format, skipping real-time subscription:', currentAdmin.admin_id);
        }
    }
    return currentAdmin;
}

async function fetchNotifications() {
    try {
        if (!currentAdmin && !(await getCurrentAdminInfo())) return [];

        // Check if admin_id is valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUuid = uuidRegex.test(currentAdmin?.admin_id);
        
        if (!isValidUuid) {
            console.log('Admin ID is not UUID format, skipping notification fetch');
            return [];
        }

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('admin_id', currentAdmin?.admin_id)  
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

function startNotificationPolling() {
    if (notificationInterval) clearInterval(notificationInterval);
    
    fetchNotifications();
    
    notificationInterval = setInterval(() => {
        fetchNotifications();
    }, 60000);
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
        renderNotificationList();
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
            .eq('admin_id', currentAdmin?.admin_id)
            .eq('is_read', false);
        
        if (error) throw error;
        
        unreadNotifications = [];
        updateNotificationBadge();
        showSuccessToast('All notifications marked as read', 'Cleared');
        renderNotificationList();
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
        case 'appeal': return 'fa-gavel';
        default: return 'fa-bell';
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
                background: var(--surface, white);
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                overflow: hidden;
                border: 1px solid var(--border, #e2e8f0);
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
                border-bottom: 1px solid var(--border, #e2e8f0);
                cursor: pointer;
                transition: background 0.2s;
            }
            .notification-item:hover {
                background: var(--bg, #f8fafc);
            }
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
                color: var(--text, #0f172a);
                margin-bottom: 4px;
            }
            .notification-message {
                font-size: 13px;
                color: var(--text-2, #334155);
                margin-bottom: 4px;
            }
            .notification-time {
                font-size: 11px;
                color: var(--text-3, #64748b);
            }
            .mark-read-btn {
                background: none;
                border: none;
                color: var(--text-3, #64748b);
                cursor: pointer;
                padding: 6px;
                border-radius: 8px;
                flex-shrink: 0;
            }
            .mark-read-btn:hover {
                background: var(--border, #e2e8f0);
                color: #10b981;
            }
            .empty-notifications {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-3, #64748b);
            }
            .empty-notifications i {
                font-size: 48px;
                margin-bottom: 12px;
            }
            body.dark-mode .notification-panel {
                background: #1e293b;
            }
            body.dark-mode .notification-item {
                border-bottom-color: #334155;
            }
            body.dark-mode .notification-item:hover {
                background: #334155;
            }
            body.dark-mode .notification-title {
                color: #f1f5f9;
            }
            body.dark-mode .notification-message {
                color: #94a3b8;
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

// ============ APPEAL DATA ============
let appealsData = [];
let penaltiesData = [];
let studentsData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPenaltyFilter = '';

// ============ FIXED LOAD DATA - Better student matching ============
async function loadData() {
    try {
        showInfoToast('Loading appeals...', 'Please Wait', 1000);
        
        const [appealsRes, penaltiesRes, studentsRes] = await Promise.all([
            supabase.from('appeals').select('*').order('created_at', { ascending: false }),
            supabase.from('penalties').select('id, student_id, violation, student_email, student_name'),
            supabase.from('students').select('*')
        ]);
        
        if (appealsRes.error) throw appealsRes.error;
        if (penaltiesRes.error) throw penaltiesRes.error;
        if (studentsRes.error) throw studentsRes.error;
        
        appealsData = appealsRes.data || [];
        penaltiesData = penaltiesRes.data || [];
        studentsData = studentsRes.data || [];
        
        // Create multiple lookup maps for different matching scenarios
        const studentByIdMap = {};
        const studentByEmailMap = {};
        const studentByIdNumberMap = {};
        
        studentsData.forEach(s => { 
            studentByIdMap[s.id] = s;
            if (s.email) studentByEmailMap[s.email.toLowerCase()] = s;
            if (s.student_id_number) studentByIdNumberMap[s.student_id_number] = s;
            if (s.student_id) studentByIdNumberMap[s.student_id] = s;
        });
        
        // Enhance appeals with student and penalty data
        appealsData = appealsData.map(appeal => {
            const penalty = penaltiesData.find(p => p.id === appeal.penalty_id);
            
            // Try multiple ways to find the student
            let student = null;
            
            // Method 1: Try by student_id (UUID)
            if (appeal.student_id && studentByIdMap[appeal.student_id]) {
                student = studentByIdMap[appeal.student_id];
            }
            // Method 2: Try by student_email
            else if (appeal.student_email && studentByEmailMap[appeal.student_email.toLowerCase()]) {
                student = studentByEmailMap[appeal.student_email.toLowerCase()];
            }
            // Method 3: Try by student_id from penalty
            else if (penalty?.student_id && studentByIdNumberMap[penalty.student_id]) {
                student = studentByIdNumberMap[penalty.student_id];
            }
            // Method 4: Try by student_name from penalty
            else if (penalty?.student_name) {
                const nameMatch = studentsData.find(s => 
                    s.name?.toLowerCase().includes(penalty.student_name.toLowerCase()) ||
                    penalty.student_name.toLowerCase().includes(s.name?.toLowerCase())
                );
                if (nameMatch) student = nameMatch;
            }
            
            // Use penalty student info as fallback if student not found
            const studentName = student?.name || penalty?.student_name || appeal.student_name || 'Unknown Student';
            const studentEmail = student?.email || penalty?.student_email || appeal.student_email || 'N/A';
            const studentId = student?.id || penalty?.student_id || appeal.student_id || 'N/A';
            
            return {
                ...appeal,
                student_id: studentId,
                student_name: studentName,
                student_email: studentEmail,
                violation: penalty?.violation || appeal.penalty_violation || 'Unknown Violation'
            };
        });
        
        updateStats();
        renderAppeals();
        populatePenaltyFilter();
        
        showSuccessToast(`Loaded ${appealsData.length} appeals`, 'Data Loaded', 2000);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorToast('Failed to load appeals: ' + error.message, 'Error');
    }
}

function updateStats() {
    const total = appealsData.length;
    const pending = appealsData.filter(a => a.status === 'pending').length;
    const approved = appealsData.filter(a => a.status === 'approved').length;
    const rejected = appealsData.filter(a => a.status === 'rejected').length;
    
    const totalEl = document.getElementById('totalAppeals');
    const pendingEl = document.getElementById('pendingAppeals');
    const approvedEl = document.getElementById('approvedAppeals');
    const rejectedEl = document.getElementById('rejectedAppeals');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function populatePenaltyFilter() {
    const filterSelect = document.getElementById('filterPenalty');
    if (!filterSelect) return;
    
    const uniqueViolations = [...new Set(appealsData.map(a => a.violation).filter(v => v))];
    filterSelect.innerHTML = '<option value="">All Penalties</option>' + 
        uniqueViolations.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}

function filterAppeals() {
    let filtered = [...appealsData];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.status === currentFilter);
    }
    
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(a => 
            a.student_name?.toLowerCase().includes(search) ||
            a.violation?.toLowerCase().includes(search) ||
            a.appeal_reason?.toLowerCase().includes(search)
        );
    }
    
    if (currentPenaltyFilter) {
        filtered = filtered.filter(a => a.violation === currentPenaltyFilter);
    }
    
    return filtered;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return '⏳ Pending';
        case 'in-review': return '🔄 In Review';
        case 'approved': return '✅ Approved';
        case 'rejected': return '❌ Rejected';
        default: return status;
    }
}

function getPriorityIcon(priority) {
    switch(priority) {
        case 'high': return '🔴 High';
        case 'medium': return '🟠 Medium';
        case 'low': return '🟢 Low';
        default: return '⚪ Normal';
    }
}

// ============ RENDER APPEALS - 6 COLUMNS ============
function renderAppeals() {
    const tbody = document.getElementById('appealsTableBody');
    if (!tbody) return;
    
    const filtered = filterAppeals();
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-icon">📭</div><div>No appeals found</div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(appeal => {
        let statusClass = 'status-pending';
        if (appeal.status === 'approved') statusClass = 'status-approved';
        if (appeal.status === 'rejected') statusClass = 'status-rejected';
        
        return `
            <tr data-id="${appeal.id}">
                <td class="student-name-cell"><strong>${escapeHtml(appeal.student_name)}</strong></td>
                <td>${escapeHtml(appeal.violation)}</td>
                <td class="appeal-reason-cell" title="${escapeHtml(appeal.appeal_reason || '')}">
                    ${escapeHtml(appeal.appeal_reason?.substring(0, 80))}${appeal.appeal_reason?.length > 80 ? '...' : ''}
                </td>
                <td><span class="status-badge ${statusClass}">${getStatusText(appeal.status)}</span></td>
                <td>${formatDate(appeal.created_at)}</td>
                <td class="action-cell">
                    <button class="view-appeal-btn" data-id="${appeal.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.view-appeal-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewClick);
        btn.addEventListener('click', handleViewClick);
    });
}

function handleViewClick(event) {
    const button = event.currentTarget;
    const appealId = button.getAttribute('data-id');
    if (appealId) {
        viewAppealDetails(appealId);
    }
}

// ============ VIEW APPEAL DETAILS ============
async function viewAppealDetails(appealId) {
    console.log('Viewing appeal:', appealId);
    
    const appeal = appealsData.find(a => String(a.id) === String(appealId));
    
    if (!appeal) {
        console.error('Appeal not found:', appealId);
        showErrorToast('Appeal not found', 'Error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'appeal-detail-modal';
    modal.innerHTML = `
        <div class="appeal-detail-content">
            <div class="appeal-detail-header">
                <h3><i class="fas fa-gavel"></i> Appeal Details</h3>
                <p>Appeal #${escapeHtml(String(appeal.id).substring(0, 8))}</p>
            </div>
            <div class="appeal-detail-body">
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label"><i class="fas fa-user-graduate"></i> Student Information</div>
                    <div class="appeal-detail-value">
                        <div><strong>Student ID:</strong> ${escapeHtml(appeal.student_id)}</div>
                        <div><strong>Name:</strong> ${escapeHtml(appeal.student_name)}</div>
                        <div><strong>Email:</strong> ${escapeHtml(appeal.student_email)}</div>
                    </div>
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label"><i class="fas fa-exclamation-triangle"></i> Penalty Information</div>
                    <div class="appeal-detail-value">
                        <div><strong>Violation:</strong> ${escapeHtml(appeal.violation)}</div>
                        <div><strong>Submitted:</strong> ${formatDate(appeal.submitted_at || appeal.created_at)}</div>
                    </div>
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label"><i class="fas fa-comment-dots"></i> Appeal Details</div>
                    <div class="appeal-message">
                        <strong>Reason for Appeal:</strong><br>
                        ${escapeHtml(appeal.appeal_reason || 'No reason provided')}
                    </div>
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label"><i class="fas fa-flag"></i> Status</div>
                    <div class="appeal-detail-value">
                        <div><strong>Priority:</strong> ${getPriorityIcon(appeal.priority)}</div>
                        <div><strong>Current Status:</strong> <span class="status-badge status-${appeal.status}">${getStatusText(appeal.status)}</span></div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    ${appeal.status === 'pending' ? `
                        <button class="btn-approve" data-id="${appeal.id}"><i class="fas fa-check"></i> Approve</button>
                        <button class="btn-reject" data-id="${appeal.id}"><i class="fas fa-times"></i> Reject</button>
                    ` : ''}
                    <button class="btn-close-detail"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles if not exists
    if (!document.getElementById('appealModalStyles')) {
        const style = document.createElement('style');
        style.id = 'appealModalStyles';
        style.textContent = `
            .appeal-detail-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .appeal-detail-content {
                background: var(--surface, white);
                border-radius: 24px;
                width: 90%;
                max-width: 550px;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .appeal-detail-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                position: sticky;
                top: 0;
            }
            .appeal-detail-header h3 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 10px; }
            .appeal-detail-header p { margin: 8px 0 0 0; font-size: 12px; opacity: 0.8; }
            .appeal-detail-body { padding: 24px; }
            .appeal-detail-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border, #e2e8f0); }
            .appeal-detail-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .appeal-detail-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-3, #64748b); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            .appeal-detail-value { font-size: 14px; color: var(--text, #0f172a); background: var(--bg, #f8fafc); padding: 14px 18px; border-radius: 12px; }
            .appeal-message { background: var(--bg, #f8fafc); padding: 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; color: var(--text, #0f172a); border-left: 3px solid #3b82f6; }
            .action-buttons { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
            .btn-approve, .btn-reject, .btn-close-detail { flex: 1; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .btn-approve { background: linear-gradient(135deg, #10b981, #059669); color: white; }
            .btn-reject { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
            .btn-close-detail { background: var(--bg, #f8fafc); border: 1px solid var(--border, #e2e8f0); color: var(--text, #0f172a); }
            @media (max-width: 640px) { .action-buttons { flex-direction: column; } }
            body.dark-mode .appeal-detail-content { background: #1e293b; }
            body.dark-mode .appeal-detail-section { border-bottom-color: #334155; }
            body.dark-mode .appeal-detail-value { background: #0f172a; color: #e2e8f0; }
            body.dark-mode .appeal-message { background: #0f172a; color: #e2e8f0; }
        `;
        document.head.appendChild(style);
    }
    
    if (appeal.status === 'pending') {
        const approveBtn = modal.querySelector('.btn-approve');
        const rejectBtn = modal.querySelector('.btn-reject');
        
        if (approveBtn) {
            approveBtn.addEventListener('click', async () => {
                await updateAppealStatus(appeal.id, 'approved', null);
                modal.remove();
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async () => {
                const reason = prompt('Enter reason for rejection (optional):');
                await updateAppealStatus(appeal.id, 'rejected', reason);
                modal.remove();
            });
        }
    }
    
    const closeBtn = modal.querySelector('.btn-close-detail');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove());
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function updateAppealStatus(appealId, newStatus, adminNotes) {
    try {
        const updateData = {
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentAdmin?.admin_id || currentAdmin?.full_name || 'Admin'
        };
        if (adminNotes) updateData.admin_notes = adminNotes;
        
        const { error } = await supabase
            .from('appeals')
            .update(updateData)
            .eq('id', appealId);
        
        if (error) throw error;
        
        // Update local data
        const appealIndex = appealsData.findIndex(a => String(a.id) === String(appealId));
        if (appealIndex !== -1) {
            appealsData[appealIndex].status = newStatus;
            appealsData[appealIndex].admin_notes = adminNotes;
            appealsData[appealIndex].reviewed_at = new Date().toISOString();
            appealsData[appealIndex].reviewed_by = currentAdmin?.full_name || 'Admin';
        }
        
        updateStats();
        renderAppeals();
        showSuccessToast(`Appeal ${newStatus} successfully!`, 'Status Updated');
        
    } catch (error) {
        console.error('Error updating appeal:', error);
        showErrorToast('Failed to update appeal status: ' + error.message, 'Error');
    }
}

// ============ DARK MODE ============
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const saved = localStorage.getItem('docst_dark_mode');
    if (saved === 'enabled') {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    toggle?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
        toggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        showInfoToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'Display', 1500);
    });
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.status;
                renderAppeals();
            });
        });
    }
    
    const searchInput = document.getElementById('searchAppeals');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderAppeals();
        });
    }
    
    const filterPenalty = document.getElementById('filterPenalty');
    if (filterPenalty) {
        filterPenalty.addEventListener('change', (e) => {
            currentPenaltyFilter = e.target.value;
            renderAppeals();
        });
    }
    
    // Notification button
    const notifyBtn = document.getElementById('notifyBtn');
    if (notifyBtn) {
        const newNotifyBtn = notifyBtn.cloneNode(true);
        notifyBtn.parentNode.replaceChild(newNotifyBtn, notifyBtn);
        
        newNotifyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showNotificationPanel();
        });
    }
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
        .toast-success { border-left-color: #10b981; background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); }
        .toast-error { border-left-color: #ef4444; background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%); }
        .toast-warning { border-left-color: #f59e0b; background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%); }
        .toast-info { border-left-color: #3b82f6; background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%); }
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
        .toast-success .toast-icon { background: #10b981; color: white; }
        .toast-error .toast-icon { background: #ef4444; color: white; }
        .toast-warning .toast-icon { background: #f59e0b; color: white; }
        .toast-info .toast-icon { background: #3b82f6; color: white; }
        .toast-content { flex: 1; }
        .toast-title { font-weight: 700; font-size: 13px; margin-bottom: 2px; color: #1f2937; }
        .toast-message { font-size: 12px; color: #6b7280; line-height: 1.4; }
        .toast-close {
            background: none;
            border: none;
            font-size: 12px;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
        }
        .toast-close:hover { background: rgba(0, 0, 0, 0.05); color: #6b7280; }
        @keyframes toastSlideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastSlideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
        .toast-removing { animation: toastSlideOut 0.25s ease forwards; }
        body.dark-mode .toast { background: #1e293b; }
        body.dark-mode .toast-title { color: #f1f5f9; }
        body.dark-mode .toast-message { color: #94a3b8; }
        body.dark-mode .toast-success { background: linear-gradient(135deg, #1e293b 0%, #064e3b 100%); }
        body.dark-mode .toast-error { background: linear-gradient(135deg, #1e293b 0%, #7f1d1d 100%); }
        body.dark-mode .toast-warning { background: linear-gradient(135deg, #1e293b 0%, #78350f 100%); }
        body.dark-mode .toast-info { background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%); }
    `;
    document.head.appendChild(style);
}

// ============ CLEANUP ON PAGE UNLOAD ============
window.addEventListener('beforeunload', () => {
    if (notificationChannel) {
        try {
            notificationChannel.unsubscribe();
        } catch(e) {}
    }
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
});

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Appeal History Page...');
    initDarkMode();
    await getCurrentAdminInfo();
    await loadData();
    setupEventListeners();
    
    // Start notification system (real-time + fallback polling)
    startNotificationPolling();
    
    // Initialize admin drawer - FIXED: Use the imported function correctly
    if (typeof initDrawer === 'function') {
        console.log('Calling initDrawer from drawer-admin.js');
        initDrawer();
    } else {
        console.log('initDrawer not found, trying alternative...');
        // Fallback: try to call initAdminDrawer if that's what's exported
        import('/Assets/drawer-admin.js').then(module => {
            if (module.initAdminDrawer) {
                module.initAdminDrawer();
            }
        }).catch(err => console.error('Failed to load drawer module:', err));
    }
}

init();