import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { initAdminDrawer, getCurrentAdmin, showLogoutToast } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    currentAdmin = getCurrentAdmin();
    if (currentAdmin) {
        // Unsubscribe from existing channel if any
        if (notificationChannel) {
            notificationChannel.unsubscribe();
        }
        
        // Subscribe to real-time notifications
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
                    console.log('🔔 New notification received:', payload);
                    const newNotification = payload.new;
                    
                    // Add to unread notifications
                    unreadNotifications.unshift(newNotification);
                    updateNotificationBadge();
                    
                    // Show toast for new notification
                    showNotificationToast(newNotification);
                    
                    // If notification panel is open, refresh it
                    const panel = document.getElementById('notificationPanel');
                    if (panel && panel.classList.contains('show')) {
                        renderNotificationList();
                    }
                }
            )
            .subscribe((status) => {
                console.log('Notification subscription status:', status);
            });
    }
    return currentAdmin;
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
                animation: badgePulse 0.3s ease;
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
            notificationBadge.style.animation = 'badgePulse 0.3s ease';
            setTimeout(() => {
                if (notificationBadge) notificationBadge.style.animation = '';
            }, 300);
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
    
    // Only fetch existing notifications, real-time handles new ones
    fetchNotifications();
    
    // Poll every 60 seconds to catch any missed notifications (fallback)
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
            @keyframes badgePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
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

// ============ APPEAL DATA ============
let appealsData = [];
let penaltiesData = [];
let studentsData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPenaltyFilter = '';

// ============ LOAD DATA ============
async function loadData() {
    try {
        showInfoToast('Loading appeals...', 'Please Wait', 1000);
        
        const [appealsRes, penaltiesRes, studentsRes] = await Promise.all([
            supabase.from('appeals').select('*').order('created_at', { ascending: false }),
            supabase.from('penalties').select('id, student_id, violation'),
            supabase.from('students').select('id, name, email')
        ]);
        
        if (appealsRes.error) throw appealsRes.error;
        if (penaltiesRes.error) throw penaltiesRes.error;
        if (studentsRes.error) throw studentsRes.error;
        
        appealsData = appealsRes.data || [];
        penaltiesData = penaltiesRes.data || [];
        studentsData = studentsRes.data || [];
        
        // Create student lookup map
        const studentMap = {};
        studentsData.forEach(s => { studentMap[s.id] = s; });
        
        // Enhance appeals with student and penalty data
        appealsData = appealsData.map(appeal => {
            const penalty = penaltiesData.find(p => p.id === appeal.penalty_id);
            const student = studentMap[appeal.student_id] || { name: 'Unknown', email: 'N/A' };
            return {
                ...appeal,
                student_name: student.name,
                student_email: student.email,
                violation: penalty?.violation || appeal.penalty_violation || 'Unknown Violation'
            };
        });
        
        updateStats();
        renderAppeals();
        populatePenaltyFilter();
        
        showSuccessToast(`Loaded ${appealsData.length} appeals`, 'Data Loaded', 2000);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorToast('Failed to load appeals', 'Error');
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
            a.student_id?.toLowerCase().includes(search) ||
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

function renderAppeals() {
    const tbody = document.getElementById('appealsTableBody');
    if (!tbody) return;
    
    const filtered = filterAppeals();
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-icon">📭</div><div>No appeals found</div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(appeal => `
        <tr data-id="${appeal.id}">
            <td><strong>${escapeHtml(appeal.student_id)}</strong></td>
            <td>${escapeHtml(appeal.student_name)}</span></td>
            <td>${escapeHtml(appeal.violation)}</span></td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(appeal.appeal_reason?.substring(0, 60))}${appeal.appeal_reason?.length > 60 ? '...' : ''}
              </span></td>
            <td><span class="status-badge status-${appeal.status}">${getStatusText(appeal.status)}</span></td>
            <td>${formatDate(appeal.created_at)}</span></td>
            <td><button class="view-appeal-btn" data-id="${appeal.id}">👁️ View</button></span></td>
        </tr>
    `).join('');
    
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
                    <div class="appeal-detail-label">
                        <i class="fas fa-user-graduate"></i> Student Information
                    </div>
                    <div class="appeal-detail-value">
                        <div><strong>Student ID:</strong> ${escapeHtml(appeal.student_id)}</div>
                        <div><strong>Name:</strong> ${escapeHtml(appeal.student_name)}</div>
                        <div><strong>Email:</strong> ${escapeHtml(appeal.student_email)}</div>
                        ${appeal.ip_address ? `<div><strong>IP Address:</strong> ${escapeHtml(appeal.ip_address)}</div>` : ''}
                    </div>
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-exclamation-triangle"></i> Penalty Information
                    </div>
                    <div class="appeal-detail-value">
                        <div><strong>Violation:</strong> ${escapeHtml(appeal.violation)}</div>
                        <div><strong>Original Hours:</strong> ${appeal.penalty_hours || 0} hours</div>
                        ${appeal.penalty_deadline ? `<div><strong>Original Deadline:</strong> ${new Date(appeal.penalty_deadline).toLocaleDateString()}</div>` : ''}
                        <div><strong>Submitted:</strong> ${formatDate(appeal.submitted_at || appeal.created_at)}</div>
                    </div>
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-comment-dots"></i> Appeal Details
                    </div>
                    <div class="appeal-message">
                        <strong>Reason for Appeal:</strong><br>
                        ${escapeHtml(appeal.appeal_reason || 'No reason provided')}
                    </div>
                    ${appeal.supporting_statement && appeal.supporting_statement.trim() !== '' ? `
                    <div class="appeal-message supporting-message" style="margin-top: 12px;">
                        <strong>Supporting Statement:</strong><br>
                        ${escapeHtml(appeal.supporting_statement)}
                    </div>
                    ` : `
                    <div class="appeal-message supporting-message" style="margin-top: 12px; opacity: 0.7;">
                        <strong>Supporting Statement:</strong><br>
                        <em>No supporting statement provided</em>
                    </div>
                    `}
                </div>
                
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-flag"></i> Priority & Status
                    </div>
                    <div class="appeal-detail-value">
                        <div><strong>Priority:</strong> ${getPriorityIcon(appeal.priority)}</div>
                        <div><strong>Current Status:</strong> <span class="status-badge status-${appeal.status}">${getStatusText(appeal.status)}</span></div>
                        ${appeal.reviewed_by ? `<div><strong>Reviewed By:</strong> ${escapeHtml(appeal.reviewed_by)}</div>` : ''}
                        ${appeal.reviewed_at ? `<div><strong>Reviewed At:</strong> ${formatDate(appeal.reviewed_at)}</div>` : ''}
                    </div>
                </div>
                
                ${appeal.admin_notes ? `
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-sticky-note"></i> Admin Notes
                    </div>
                    <div class="appeal-message admin-message">
                        ${escapeHtml(appeal.admin_notes)}
                    </div>
                </div>
                ` : ''}
                
                ${appeal.review_comment ? `
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-comment"></i> Review Comment
                    </div>
                    <div class="appeal-message admin-message">
                        ${escapeHtml(appeal.review_comment)}
                    </div>
                </div>
                ` : ''}
                
                ${appeal.decision_reason ? `
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-gavel"></i> Decision Reason
                    </div>
                    <div class="appeal-message admin-message">
                        ${escapeHtml(appeal.decision_reason)}
                    </div>
                </div>
                ` : ''}
                
                ${appeal.adjusted_hours !== null && appeal.adjusted_hours !== undefined ? `
                <div class="appeal-detail-section">
                    <div class="appeal-detail-label">
                        <i class="fas fa-clock"></i> Adjustments
                    </div>
                    <div class="appeal-detail-value">
                        <div><strong>Adjusted Hours:</strong> ${appeal.adjusted_hours} hours (was ${appeal.penalty_hours || 0})</div>
                        ${appeal.new_deadline ? `<div><strong>New Deadline:</strong> ${new Date(appeal.new_deadline).toLocaleDateString()}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <div class="action-buttons">
                    ${appeal.status === 'pending' ? `
                        <button class="btn-approve" data-id="${appeal.id}"><i class="fas fa-check"></i> Approve</button>
                        <button class="btn-reject" data-id="${appeal.id}"><i class="fas fa-times"></i> Reject</button>
                        <button class="btn-close-detail"><i class="fas fa-times"></i> Close</button>
                    ` : `
                        <button class="btn-close-detail"><i class="fas fa-check"></i> Close</button>
                    `}
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
                animation: fadeIn 0.2s ease;
            }
            .appeal-detail-content {
                background: var(--surface);
                border-radius: 24px;
                width: 90%;
                max-width: 600px;
                max-height: 85vh;
                overflow-y: auto;
                animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .appeal-detail-content::-webkit-scrollbar {
                width: 6px;
            }
            .appeal-detail-content::-webkit-scrollbar-track {
                background: var(--border);
                border-radius: 10px;
            }
            .appeal-detail-content::-webkit-scrollbar-thumb {
                background: var(--blue);
                border-radius: 10px;
            }
            .appeal-detail-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, var(--blue), var(--blue-dark));
                color: white;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .appeal-detail-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .appeal-detail-header p {
                margin: 8px 0 0 0;
                font-size: 12px;
                opacity: 0.8;
            }
            .appeal-detail-body {
                padding: 24px;
            }
            .appeal-detail-section {
                margin-bottom: 20px;
                padding: 0 0 16px 0;
                border-bottom: 1px solid var(--border);
            }
            .appeal-detail-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .appeal-detail-label {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-3);
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .appeal-detail-label i {
                font-size: 14px;
            }
            .appeal-detail-value {
                font-size: 14px;
                color: var(--text);
                line-height: 1.6;
                background: var(--bg);
                padding: 14px 18px;
                border-radius: 12px;
            }
            .appeal-detail-value div {
                margin-bottom: 6px;
            }
            .appeal-detail-value div:last-child {
                margin-bottom: 0;
            }
            .appeal-message {
                background: var(--bg);
                padding: 16px;
                border-radius: 12px;
                margin-top: 4px;
                font-size: 14px;
                line-height: 1.6;
                color: var(--text);
                border-left: 3px solid var(--blue);
            }
            .supporting-message {
                background: var(--blue-light);
                border-left-color: var(--green);
            }
            .admin-message {
                background: var(--amber-light);
                border-left-color: var(--amber);
            }
            .action-buttons {
                display: flex;
                gap: 12px;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid var(--border);
                flex-wrap: wrap;
            }
            .btn-approve {
                flex: 1;
                padding: 12px 20px;
                background: linear-gradient(135deg, #10b981, #059669);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-width: 120px;
            }
            .btn-approve:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .btn-reject {
                flex: 1;
                padding: 12px 20px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-width: 120px;
            }
            .btn-reject:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
            .btn-close-detail {
                flex: 1;
                padding: 12px 20px;
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 12px;
                color: var(--text);
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-width: 120px;
            }
            .btn-close-detail:hover {
                background: var(--border);
            }
            @media (max-width: 640px) {
                .action-buttons {
                    flex-direction: column;
                }
                .btn-approve, .btn-reject, .btn-close-detail {
                    width: 100%;
                }
                .appeal-detail-content {
                    width: 95%;
                }
                .appeal-detail-body {
                    padding: 16px;
                }
                .appeal-detail-header {
                    padding: 16px;
                }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            body.dark-mode .appeal-detail-content {
                background: #1E293B;
            }
            body.dark-mode .appeal-detail-section {
                border-bottom-color: #334155;
            }
            body.dark-mode .appeal-detail-value {
                background: #0F172A;
                color: #E2E8F0;
            }
            body.dark-mode .appeal-message {
                background: #0F172A;
                color: #E2E8F0;
                border-left-color: #3B82F6;
            }
            body.dark-mode .supporting-message {
                background: #064E3B;
                border-left-color: #10B981;
            }
            body.dark-mode .admin-message {
                background: #78350F;
                border-left-color: #F59E0B;
            }
            body.dark-mode .btn-close-detail {
                background: #334155;
                border-color: #475569;
                color: #E2E8F0;
            }
            body.dark-mode .btn-close-detail:hover {
                background: #475569;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add event listeners for buttons
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
            reviewed_by: currentAdmin?.admin_id || currentAdmin?.email || 'admin'
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
        }
        
        // Create notification for student
        await createStudentNotification(appealId, newStatus);
        
        updateStats();
        renderAppeals();
        showSuccessToast(`Appeal ${newStatus} successfully!`, 'Status Updated');
        
    } catch (error) {
        console.error('Error updating appeal:', error);
        showErrorToast('Failed to update appeal status', 'Error');
    }
}

async function createStudentNotification(appealId, status) {
    const appeal = appealsData.find(a => String(a.id) === String(appealId));
    if (!appeal) return;
    
    const title = status === 'approved' ? 'Appeal Approved ✓' : 'Appeal Rejected ✗';
    const message = status === 'approved' 
        ? `Your appeal for ${appeal.violation} has been approved. The penalty has been reviewed.`
        : `Your appeal for ${appeal.violation} has been reviewed. ${appeal.admin_notes ? `Note: ${appeal.admin_notes}` : 'Please contact the disciplinary office for more information.'}`;
    const type = status === 'approved' ? 'success' : 'error';
    
    const { error } = await supabase
        .from('notifications')
        .insert({
            student_id: appeal.student_id,
            title: title,
            message: message,
            type: type,
            is_read: false,
            created_at: new Date().toISOString()
        });
    
    if (error) console.error('Error creating student notification:', error);
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.status;
            renderAppeals();
        });
    });
    
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
    
    // Notification button - ensure it works
    const notifyBtn = document.getElementById('notifyBtn');
    if (notifyBtn) {
        // Remove any existing listeners to avoid duplicates
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
        notificationChannel.unsubscribe();
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
    
    // Initialize admin drawer
    initAdminDrawer();
}

init();