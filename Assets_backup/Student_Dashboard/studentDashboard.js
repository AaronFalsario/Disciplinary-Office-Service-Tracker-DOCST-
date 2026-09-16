import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// CONFIGURATION
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseClient = supabase || {
    from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => Promise.resolve({ data: [], error: null }),
        delete: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
    })
};

// STATE
let currentStudent = null;
let myPenalties = [];
let myAppeals = [];
let myReports = [];
let notifications = [];
let unreadCount = 0;
let currentTab = 'dashboard';
let currentLanguage = localStorage.getItem('student_language') || 'English';

function cleanDescription(desc, violation) {
    if (!desc) return '—';
    if (desc === violation) return desc;

    const autoPenalties = [
        'Warning Only - No community service required',
        '5 hours Community Service + Formal Notice',
        '10 hours Community Service + Meeting with SAO',
        'Warning Only',
        '5 hours Community Service',
        '10 hours Community Service'
    ];

    let cleanedDesc = desc;
    autoPenalties.forEach(penalty => {
        cleanedDesc = cleanedDesc.replace(` - ${penalty}`, '');
        cleanedDesc = cleanedDesc.replace(`- ${penalty}`, '');
        cleanedDesc = cleanedDesc.replace(`${penalty}`, '');
    });

    cleanedDesc = cleanedDesc.trim();
    if (!cleanedDesc || cleanedDesc === '-' || cleanedDesc === '—') {
        return violation || '—';
    }
    return cleanedDesc;
}

// DELETE CONFIRMATION MODAL
function showDeleteConfirm(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div class="delete-confirm-modal" style="
            background: var(--surface, #ffffff);
            border-radius: 16px;
            max-width: 420px;
            width: 90%;
            padding: 0;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
            overflow: hidden;
        ">
            <div class="delete-modal-header" style="
                padding: 20px 24px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid var(--border, #e2e8f0);
            ">
                <div class="delete-icon" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #fef2f2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 22px; height: 22px; stroke: #dc2626; fill: none;">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <div>
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text, #0f172a); margin: 0;">${title}</h3>
                    <p style="font-size: 14px; color: var(--text-2, #475569); margin: 4px 0 0;">${message}</p>
                </div>
            </div>
            <div class="delete-modal-body" style="
                padding: 20px 24px;
                border-bottom: 1px solid var(--border, #e2e8f0);
            ">
                <div style="
                    background: #fef2f2;
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #dc2626; fill: none; flex-shrink: 0;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    <span style="font-size: 13px; color: #991b1b; font-weight: 500;">This action cannot be undone</span>
                </div>
            </div>
            <div class="delete-modal-footer" style="
                padding: 16px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--bg, #f8fafc);
            ">
                <button class="delete-cancel-btn" style="
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: 1px solid var(--border, #e2e8f0);
                    background: var(--surface, #ffffff);
                    color: var(--text-2, #475569);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                ">Cancel</button>
                <button class="delete-confirm-btn" style="
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: none;
                    background: #dc2626;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: #fff; fill: none;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .delete-cancel-btn:hover {
            background: var(--bg, #f1f5f9);
        }
        .delete-confirm-btn:hover {
            background: #b91c1c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }
        body.dark-mode .delete-confirm-modal {
            background: #1e293b;
        }
        body.dark-mode .delete-modal-header {
            border-bottom-color: #334155;
        }
        body.dark-mode .delete-modal-body {
            border-bottom-color: #334155;
        }
        body.dark-mode .delete-modal-footer {
            background: #0f172a;
        }
        body.dark-mode .delete-cancel-btn {
            background: #1e293b;
            border-color: #334155;
            color: #94a3b8;
        }
        body.dark-mode .delete-cancel-btn:hover {
            background: #334155;
        }
        body.dark-mode .delete-icon {
            background: #7f1d1d;
        }
        body.dark-mode .delete-modal-body div {
            background: #7f1d1d;
        }
        body.dark-mode .delete-modal-body div span {
            color: #fca5a5;
        }
        body.dark-mode .delete-modal-header h3 {
            color: #f1f5f9;
        }
        body.dark-mode .delete-modal-header p {
            color: #94a3b8;
        }
    `;
    document.head.appendChild(style);

    const cancelBtn = overlay.querySelector('.delete-cancel-btn');
    const confirmBtn = overlay.querySelector('.delete-confirm-btn');

    const closeModal = () => {
        overlay.remove();
        style.remove();
    };

    cancelBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    return { close: closeModal };
}

// DATE DISPLAY - FIXED
function updateDateTime() {
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    const now = new Date();

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    if (dateEl) {
        dateEl.textContent = dateStr;
    }
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
}

// Start the clock
updateDateTime();
setInterval(updateDateTime, 1000);

// UTILITY FUNCTIONS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function formatRelativeTime(date) {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hrs < 24) return `${hrs} hr ago`;
    if (days < 7) return `${days} day ago`;
    return new Date(date).toLocaleDateString();
}

function getStudentInitials(name) {
    if (!name || name === 'Student') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function showToast(title, message = '', type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        return;
    }

    // If message is a valid type, shift parameters
    if (typeof message === 'string' && ['success', 'error', 'warning', 'info'].includes(message)) {
        type = message;
        message = '';
    }

    const iconPaths = {
        success: '<polyline points="20 6 9 17 4 12"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        warning: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <svg class="icon-svg" viewBox="0 0 24 24">${iconPaths[type] || iconPaths.info}</svg>
        </div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close notification">
            <svg class="icon-svg" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
        <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    const timeoutId = setTimeout(() => removeToast(toast), duration);
    toast.dataset.timeoutId = timeoutId;

    toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        const progress = toast.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
        const newTimeoutId = setTimeout(() => removeToast(toast), duration);
        toast.dataset.timeoutId = newTimeoutId;
        const progress = toast.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'running';
    });

    return toast;
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
    }
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
}

// Toast presets for common messages
const Toast = {
    success: (title, message = '') => showToast(title, message, 'success'),
    error: (title, message = '') => showToast(title, message, 'error'),
    warning: (title, message = '') => showToast(title, message, 'warning'),
    info: (title, message = '') => showToast(title, message, 'info'),
    saved: () => showToast('Saved', 'Changes saved successfully', 'success'),
    deleted: () => showToast('Deleted', 'Item has been removed', 'success'),
    updated: () => showToast('Updated', 'Information updated successfully', 'success'),
    cleared: () => showToast('Cleared', 'All items have been cleared', 'success'),
    exported: () => showToast('Export Complete', 'File downloaded successfully', 'success'),
    imported: () => showToast('Import Complete', 'Data imported successfully', 'success'),
    loggedOut: () => showToast('Logged Out', 'You have been logged out', 'warning'),
    sessionExpired: () => showToast('Session Expired', 'Please log in again', 'warning'),
    networkError: () => showToast('Connection Error', 'Please check your internet connection', 'error'),
};

function showAlert(message, type) {
    const alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = `alert ${type}`;
    alertEl.style.display = 'block';
    setTimeout(() => { alertEl.style.display = 'none'; }, 4000);
}

function formatStudentId(id) {
    if (!id) return 'N/A';
    return id;
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    if (hour >= 18 && hour < 24) return 'Good evening';
    return '';
}

// SKELETON LOADING HELPER
function setLoadingState(containerId, skeletonId, isLoading) {
    const container = document.getElementById(containerId);
    const skeleton = document.getElementById(skeletonId);

    if (container) {
        container.classList.remove('visible', 'content-container');
        if (!isLoading) {
            container.classList.add('visible');
        }
    }

    if (skeleton) {
        skeleton.classList.remove('loading');
        if (isLoading) {
            skeleton.classList.add('loading');
        }
    }
}

// AUTH
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent');
    if (!stored) {
        window.location.href = '/Assets/Student_Authentication/Student.html';
        return false;
    }
    try {
        currentStudent = JSON.parse(stored);
        if (!currentStudent.student_id_number) {
            await fetchStudentIdFromDB();
        }

        return true;
    } catch (e) {
        console.error('Auth check failed:', e);
        localStorage.removeItem('currentStudent');
        window.location.href = '/Assets/Student_Authentication/Student.html';
        return false;
    }
}

async function fetchStudentIdFromDB() {
    if (!currentStudent) return;

    try {
        const studentId = currentStudent.id || currentStudent.studentId;
        if (!studentId) return;

        const { data, error } = await supabaseClient
            .from('students')
            .select('student_id_number')
            .eq('id', studentId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching student_id_number:', error);
            return;
        }

        if (data && data.student_id_number) {
            currentStudent.student_id_number = data.student_id_number;
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        }
    } catch (e) {
        console.error('Error in fetchStudentIdFromDB:', e);
    }
}

async function ensureStudentId() {
    if (!currentStudent) return;

    if (currentStudent.student_id_numb && currentStudent.student_id_numb !== 'N/A') {
        return;
    }

    try {
        const studentId = currentStudent.id || currentStudent.studentId;
        if (!studentId) {
            console.error('No student ID found');
            return;
        }

        const { data, error } = await supabaseClient
            .from('students')
            .select('student_id_numb')
            .eq('id', studentId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching student_id_numb:', error);
            return;
        }

        if (data && data.student_id_numb) {
            currentStudent.student_id_numb = data.student_id_numb;
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        } else {
            console.warn('student_id_numb is NULL in database for this student');
            currentStudent.student_id_numb = 'N/A';
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        }
    } catch (e) {
        console.error('Error in ensureStudentId:', e);
    }
}


// NAVIGATION
function switchTab(tabId) {
    currentTab = tabId;

    const taglineMap = {
        dashboard: 'Dashboard',
        penalties: 'My Penalties',
        history: 'History',
        appeal: 'Submit Appeal',
        settings: 'Settings'
    };
    const taglineEl = document.getElementById('pageTagline');
    if (taglineEl) taglineEl.textContent = taglineMap[tabId] || 'Dashboard';

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.drawer-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabId);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabId);
    });

    if (tabId === 'dashboard') refreshDashboard();
    else if (tabId === 'penalties') refreshPenalties();
    else if (tabId === 'history') refreshHistory();
    else if (tabId === 'appeal') refreshAppeal();

    window.currentTab = currentTab;
}

// DATA FETCHING
async function loadPenalties() {
    if (!currentStudent) return [];
    const studentId = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
    try {
        let { data } = await supabaseClient
            .from('penalties')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        if (!data || data.length === 0) {
            const { data: emailData } = await supabaseClient
                .from('penalties')
                .select('*')
                .eq('student_email', currentStudent.email)
                .order('created_at', { ascending: false });
            if (emailData) data = emailData;
        }
        myPenalties = data || [];
        return myPenalties;
    } catch (e) { console.error('Error loading penalties:', e); return []; }
}

async function loadAppeals() {
    if (!currentStudent) return [];

    const studentId = currentStudent.student_id_number
        || currentStudent.studentId
        || currentStudent.id;

    try {
        let { data, error } = await supabaseClient
            .from('appeals')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Primary appeal query failed:', error.message);
        }

        if ((!data || data.length === 0) && currentStudent.email) {
            const { data: emailData } = await supabaseClient
                .from('appeals')
                .select('*')
                .eq('student_email', currentStudent.email)
                .order('created_at', { ascending: false });
            if (emailData && emailData.length > 0) data = emailData;
        }

        if ((!data || data.length === 0) && currentStudent.name) {
            const { data: nameData } = await supabaseClient
                .from('appeals')
                .select('*')
                .eq('student_name', currentStudent.name)
                .order('created_at', { ascending: false });
            if (nameData && nameData.length > 0) data = nameData;
        }

        myAppeals = data || [];
        return myAppeals;
    } catch (e) {
        console.error('Error loading appeals:', e);
        return [];
    }
}

async function loadNotifications() {
    if (!currentStudent) return [];
    const studentId = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
    try {
        await autoDeleteOldNotifications();

        const { data } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(20);

        notifications = data || [];
        unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationBadge();
        renderNotificationList();
        return notifications;
    } catch (e) {
        console.error('Error loading notifications:', e);
        return [];
    }
}

// CLEAR ALL NOTIFICATIONS
async function clearAllNotifications() {
    if (notifications.length === 0) {
        showToast('No notifications', 'Nothing to clear', 'info');
        return;
    }

    showConfirm('Clear All Notifications', 'Are you sure you want to delete all notifications? This action cannot be undone.', async () => {
        try {
            const studentId = currentStudent?.student_id_number || currentStudent?.studentId || currentStudent?.id;
            if (!studentId) {
                showToast('Error', 'Student ID not found', 'error');
                return;
            }

            const { error } = await supabaseClient
                .from('notifications')
                .delete()
                .eq('student_id', studentId);

            if (error) {
                console.error('Error clearing notifications:', error);
                showToast('Error', 'Failed to clear notifications', 'error');
                return;
            }

            notifications = [];
            unreadCount = 0;
            updateNotificationBadge();
            renderNotificationList();
            showToast('Cleared', 'All notifications cleared', 'success');
        } catch (e) {
            console.error('Error clearing notifications:', e);
            showToast('Error', 'Failed to clear notifications', 'error');
        }
    });
}

// NOTIFICATIONS
function updateNotificationBadge() {
    const btn = document.getElementById('notifyBtn');
    if (!btn) return;
    const existing = btn.querySelector('.notification-badge');
    if (existing) existing.remove();
    if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        btn.appendChild(badge);
    }
}

function renderNotificationList() {
    const container = document.getElementById('notificationModalBody');
    if (!container) return;

    autoDeleteOldNotifications();

    if (!notifications.length) {
        container.innerHTML = `<div class="empty-notifications"><svg class="icon-svg-xl" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>No notifications</p><span>You're all caught up!</span></div>`;
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${!n.is_read ? 'unread' : ''}" data-id="${n.id}">
            <div class="n-icon ${n.type || 'system'}"><svg class="icon-svg" viewBox="0 0 24 24">${getNotificationIconPath(n.type)}</svg></div>
            <div class="n-content">
                <div class="n-title">${escapeHtml(n.title)}</div>
                <div class="n-message">${escapeHtml(n.message)}</div>
                <div class="n-time">${formatRelativeTime(new Date(n.created_at))}</div>
            </div>
            <div class="n-actions">
                ${!n.is_read ? '<div class="n-dot"></div>' : ''}
                <button class="n-delete-btn" data-id="${n.id}" title="Delete notification">
                    <svg class="icon-svg" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('#notificationModalBody .notification-item').forEach(item => {
        const deleteBtn = item.querySelector('.n-delete-btn');

        item.addEventListener('click', async function (e) {
            if (e.target.closest('.n-delete-btn')) return;

            const id = parseInt(this.dataset.id);
            const notification = notifications.find(n => n.id === id);
            if (notification && !notification.is_read) {
                await markAsRead(id);
            }
            renderNotificationList();
        });

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                await deleteNotification(id);
            });
        }
    });
}

// DELETE NOTIFICATION
async function deleteNotification(id) {
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting notification:', error);
            showToast('Failed to delete notification', 'error');
            return;
        }

        notifications = notifications.filter(n => n.id !== id);
        unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationBadge();
        renderNotificationList();
        showToast('Notification deleted', 'success');
    } catch (e) {
        console.error('Error deleting notification:', e);
        showToast('Failed to delete notification', 'error');
    }
}

// AUTO-DELETE NOTIFICATIONS 24 HOURS
async function autoDeleteOldNotifications() {
    if (!notifications.length) return;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const oldNotifications = notifications.filter(n => {
        const createdAt = new Date(n.created_at);
        return createdAt < twentyFourHoursAgo;
    });

    if (oldNotifications.length === 0) return;

    try {

        const ids = oldNotifications.map(n => n.id);
        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Error auto-deleting old notifications:', error);
            return;
        }

        notifications = notifications.filter(n => {
            const createdAt = new Date(n.created_at);
            return createdAt >= twentyFourHoursAgo;
        });

        unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationBadge();

        console.log(`Auto-deleted ${oldNotifications.length} old notifications`);
    } catch (e) {
        console.error('Error in autoDeleteOldNotifications:', e);
    }
}

function getNotificationIconPath(type) {
    switch (type) {
        case 'penalty': return '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>';
        case 'appeal': return '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>';
        case 'deadline': return '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
        case 'system': return '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
        default: return '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>';
    }
}

async function markAsRead(id) {
    try {
        await supabaseClient.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
        const n = notifications.find(n => n.id === id);
        if (n && !n.is_read) {
            n.is_read = true;
            unreadCount--;
            updateNotificationBadge();
            renderNotificationList();
        }
    } catch (e) { console.error('Error marking as read:', e); }
}

async function markAllAsRead() {
    if (unreadCount === 0) {
        showToast('No unread notifications', 'info');
        return;
    }
    try {
        const studentId = currentStudent?.student_id_number || currentStudent?.studentId || currentStudent?.id;
        if (!studentId) { showToast('Student ID not found', 'error'); return; }

        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('is_read', false);

        if (error) throw error;

        notifications.forEach(n => n.is_read = true);
        unreadCount = 0;
        updateNotificationBadge();
        renderNotificationList();
        showToast('All notifications marked as read', 'success');
    } catch (e) {
        console.error('Error marking all as read:', e);
        showToast('Failed to mark all as read', 'error');
    }
}


// RENDER FUNCTIONS
function renderDashboard() {
    const penalties = myPenalties || [];
    const appeals = myAppeals || [];

    const pending = penalties.filter(p =>
        p.status === 'pending' ||
        p.status === 'Pending' ||
        p.status === 'in-progress' ||
        p.status === 'Active'
    ).length;

    const completedHours = penalties.filter(p =>
        p.status === 'completed' ||
        p.status === 'Completed' ||
        p.status === 'Resolved'
    ).reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);

    const totalHours = penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const complianceRate = totalHours ? Math.round((completedHours / totalHours) * 100) : 100;

    document.getElementById('pendingPenalties').textContent = pending;
    document.getElementById('completedHours').textContent = completedHours;
    document.getElementById('totalViolations').textContent = penalties.length;
    document.getElementById('complianceRate').textContent = `${complianceRate}%`;

    const greeting = getGreeting();
    const studentName = currentStudent?.name || 'Student';

    document.getElementById('greetingText').textContent = greeting;
    document.getElementById('studentNameDisplay').textContent = studentName;

    updateDateTime();

    const tbody = document.getElementById('dashboardPenaltiesBody');
    if (!penalties.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">
            <svg class="icon-svg-lg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <div class="empty-title">No Penalties</div>
            <div class="empty-sub">You have no violations recorded. Great job!</div>
        </td></tr>`;
    } else {
        tbody.innerHTML = penalties.slice(0, 5).map(p => {
            const isWarning = p.offense_level === '1st Offense' || p.is_warning === true;

            let displayStatus = p.status || 'Pending';
            let statusClass = 'pending';

            if (isWarning) {
                displayStatus = 'Warning Only';
                statusClass = 'warning';
            } else if (displayStatus.toLowerCase() === 'pending' || displayStatus === 'Pending') {
                displayStatus = 'Pending';
                statusClass = 'pending';
            } else if (displayStatus.toLowerCase() === 'in-progress' || displayStatus.toLowerCase() === 'active') {
                displayStatus = 'In Progress';
                statusClass = 'progress';
            } else if (displayStatus.toLowerCase() === 'completed' || displayStatus === 'Completed') {
                displayStatus = 'Completed';
                statusClass = 'completed';
            } else if (displayStatus.toLowerCase() === 'resolved' || displayStatus === 'Resolved') {
                displayStatus = 'Resolved';
                statusClass = 'completed';
            }

            return `
            <tr>
                <td>${formatDate(p.created_at)}</td>
                <td><strong>${escapeHtml(p.violation)}</strong></td>
                <td>${escapeHtml(p.service_type || 'Community Service')}</td>
                <td>${p.hours || 0} hrs</td>
                <td><span class="status-badge status-${statusClass}">${displayStatus}</span></td>
            </tr>
        `}).join('');
    }

    const hasWarning = penalties.some(p => p.offense_level === '1st Offense' || p.offense_level === 'Warning');
    const warningSection = document.getElementById('warningInfoSection');
    if (warningSection) {
        warningSection.style.display = hasWarning ? 'block' : 'none';
    }
}

function renderPenalties() {
    const penalties = myPenalties || [];

    // Count penalties by status
    const pendingCount = penalties.filter(p =>
        p.status === 'pending' ||
        p.status === 'Pending' ||
        p.status === 'in-progress' ||
        p.status === 'Active'
    ).length;

    const completedHours = penalties.filter(p =>
        p.status === 'completed' ||
        p.status === 'Completed' ||
        p.status === 'Resolved'
    ).reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);

    const totalHours = penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const complianceRate = totalHours ? Math.round((completedHours / totalHours) * 100) : 100;

    document.getElementById('penPending').textContent = pendingCount;
    document.getElementById('penCompletedHours').textContent = completedHours;
    document.getElementById('penTotal').textContent = penalties.length;
    document.getElementById('penCompliance').textContent = `${complianceRate}%`;

    const progressCard = document.getElementById('penaltyProgressCard');
    if (penalties.length > 0) {
        progressCard.style.display = 'block';
        const progress = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
        document.getElementById('progressPercentage').textContent = `${progress}%`;
        document.getElementById('overallProgressFill').style.width = `${progress}%`;
        document.getElementById('progressCompleted').textContent = `${completedHours} hours completed`;
        document.getElementById('progressTotal').textContent = `${totalHours} hours total`;
    } else {
        progressCard.style.display = 'none';
    }

    const statusFilter = document.getElementById('penaltyStatusFilter').value;
    const searchTerm = document.getElementById('penaltySearchInput').value.toLowerCase().trim();
    const sortOption = document.getElementById('penaltySortFilter').value;

    let filtered = [...penalties];

    if (statusFilter !== 'all') {
        filtered = filtered.filter(p => {
            const pStatus = p.status ? p.status.toLowerCase() : '';
            const filterStatus = statusFilter.toLowerCase();
            // Check if it's a warning (first offense)
            const isWarning = p.offense_level === '1st Offense' || p.is_warning === true;
            const isWarningStatus = filterStatus === 'warning';

            return pStatus === filterStatus ||
                (filterStatus === 'pending' && (pStatus === 'pending' || pStatus === 'in-progress' || pStatus === 'active')) ||
                (filterStatus === 'completed' && (pStatus === 'completed' || pStatus === 'resolved')) ||
                (isWarningStatus && isWarning);
        });
    }

    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.violation && p.violation.toLowerCase().includes(searchTerm)) ||
            (p.service_type && p.service_type.toLowerCase().includes(searchTerm)) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }

    switch (sortOption) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'hours-desc':
            filtered.sort((a, b) => (b.hours || 0) - (a.hours || 0));
            break;
        case 'hours-asc':
            filtered.sort((a, b) => (a.hours || 0) - (b.hours || 0));
            break;
        default:
            break;
    }

    document.getElementById('penaltiesTotalCount').textContent = filtered.length;

    const tbody = document.getElementById('penaltiesTableBody');
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">
            <svg class="icon-svg-lg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
            <div class="empty-title">${penalties.length ? 'No matching penalties' : 'No Penalty Records'}</div>
            <div class="empty-sub">${penalties.length ? 'Try adjusting your filters' : 'You have no violations recorded. Great job!'}</div>
        </td></tr>`;
    } else {
        tbody.innerHTML = filtered.map(p => {
            // Check if this is a first offense (warning only)
            const isWarning = p.offense_level === '1st Offense' || p.is_warning === true;

            // Map status for display
            let displayStatus = p.status || 'Pending';
            let statusClass = 'pending';

            // If it's a warning (first offense), display "Warning Only"
            if (isWarning) {
                displayStatus = 'Warning Only';
                statusClass = 'warning';
            } else if (displayStatus.toLowerCase() === 'pending' || displayStatus === 'Pending') {
                displayStatus = 'Pending';
                statusClass = 'pending';
            } else if (displayStatus.toLowerCase() === 'in-progress' || displayStatus.toLowerCase() === 'active') {
                displayStatus = 'In Progress';
                statusClass = 'progress';
            } else if (displayStatus.toLowerCase() === 'completed' || displayStatus === 'Completed') {
                displayStatus = 'Completed';
                statusClass = 'completed';
            } else if (displayStatus.toLowerCase() === 'resolved' || displayStatus === 'Resolved') {
                displayStatus = 'Resolved';
                statusClass = 'completed';
            }

            return `
            <tr>
                <td>${formatDate(p.created_at)}</td>
                <td><strong>${escapeHtml(p.violation)}</strong></td>
                <td>${escapeHtml(p.service_type || 'Community Service')}</td>
                <td><span style="font-weight:600;color:var(--blue);">${p.hours || 0} hrs</span></td>
                <td><span class="status-badge status-${statusClass}">${displayStatus}</span></td>
                <td>${formatDate(p.deadline)}</td>
                <td><button class="view-btn" data-id="${p.id}"><svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View</button></td>
            </tr>
        `}).join('');
    }

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const penalty = penalties.find(p => p.id == this.dataset.id);
            if (penalty) showPenaltyModal(penalty);
        });
    });
}

// RENDER HISTORY 
function renderHistory() {
    const penalties = myPenalties || [];
    const appeals = myAppeals || [];

    const completed = penalties.filter(p => p.status === 'completed' || p.status === 'Completed');
    const totalHours = completed.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);

    document.getElementById('histCompleted').textContent = completed.length;
    document.getElementById('histHours').textContent = totalHours;
    document.getElementById('histViolations').textContent = penalties.length;
    document.getElementById('histReports').textContent = myReports.length || appeals.length;

    const pBody = document.getElementById('historyPenaltiesBody');
    if (!penalties.length) {
        pBody.innerHTML = `<tr><td colspan="5" class="empty-state">
            <svg class="icon-svg-lg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <div class="empty-title">No Penalties Found</div>
            <div class="empty-sub">You have no recorded penalties</div>
        </td></tr>`;
    } else {
        pBody.innerHTML = penalties.map((p, index) => `
            <tr>
                <td><span class="row-number">${index + 1}</span></td>
                <td><strong>${escapeHtml(p.violation)}</strong></td>
                <td><span class="service-type-badge">${escapeHtml(p.service_type || 'Community Service')}</span></td>
                <td><span class="hours-badge">${p.hours || 0} hrs</span></td>
                <td>
                    <span class="status-badge status-${p.status || 'pending'}">
                        ${p.status || 'Pending'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    const aBody = document.getElementById('historyAppealsBody');
    if (!appeals.length) {
        aBody.innerHTML = `<tr><td colspan="4" class="empty-state">
            <svg class="icon-svg-lg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <div class="empty-title">No Appeals Found</div>
            <div class="empty-sub">Submit an appeal to see it here</div>
        </td></tr>`;
    } else {
        aBody.innerHTML = appeals.map((a, index) => {
            const rawStatus = (a.status || 'pending').toString().toLowerCase();
            const statusLabel = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
            const statusClass = rawStatus;

            return `
    <tr>
        <td><span class="row-number">${index + 1}</span></td>
        <td>${formatDate(a.created_at)}</td>
        <td>${escapeHtml(a.penalty_violation || a.violation || 'N/A')}</td>
        <td><span class="status-badge status-${statusClass}">${statusLabel}</span></td>
    </tr>
    `;
        }).join('');
    }

    // Tab button logic
    const tabBtns = document.querySelectorAll('#tab-history .tab-btn');
    const tabContents = document.querySelectorAll('#tab-history .tab-content');

    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const penaltyTab = document.querySelector('#tab-history .tab-btn[data-subtab="penalties"]');
    const penaltyContent = document.getElementById('subtab-penalties');

    if (penaltyTab) penaltyTab.classList.add('active');
    if (penaltyContent) penaltyContent.classList.add('active');

    tabBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('#tab-history .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#tab-history .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#tab-history .tab-content').forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const contentId = `subtab-${this.dataset.subtab}`;
            const content = document.getElementById(contentId);
            if (content) content.classList.add('active');
        });
    });
}

function renderAppeal() {
    const penalties = myPenalties || [];
    const appeals = myAppeals || [];

    const select = document.getElementById('penaltySelect');
    const appealable = penalties.filter(p => {
        const status = p.status ? p.status.toLowerCase() : '';
        return status !== 'completed' && status !== 'Completed' && (p.hours || 0) > 0;
    });

    if (!appealable.length) {
        select.innerHTML = '<option value="">No penalties available for appeal</option>';
        select.disabled = true;
        return;
    }
    select.innerHTML = '<option value="">Select a penalty to appeal</option>' +
        appealable.map(p =>
            `<option value="${p.id}" data-violation="${escapeHtml(p.violation)}" data-hours="${p.hours}" data-deadline="${p.deadline}">${escapeHtml(p.violation)} - ${p.hours} hours</option>`
        ).join('');
    select.disabled = false;

    // Recent Appeals Table
    const tbody = document.getElementById('appealsTableBody');
    if (!appeals.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">
            <svg class="icon-svg-lg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <div class="empty-title">No Appeals Found</div>
            <div class="empty-sub">Submit an appeal to see it here</div>
        </td></tr>`;
    } else {
        tbody.innerHTML = appeals.slice(0, 5).map(a => {
            const rawStatus = (a.status || 'pending').toString().toLowerCase();
            const statusLabel = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
            const statusClass = rawStatus;
            return `
    <tr>
        <td>${formatDate(a.created_at)}</td>
        <td>${escapeHtml(a.penalty_violation || a.violation || 'N/A')}</td>
        <td><span class="status-badge status-${statusClass}">${statusLabel}</span></td>
        <td><button class="view-btn" data-id="${a.id}"><svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View</button></td>
    </tr>
    `;
        }).join('');
    }

    document.querySelectorAll('#appealsTableBody .view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const appeal = appeals.find(a => a.id == this.dataset.id);
            if (appeal) showAppealModal(appeal);
        });
    });

    select.onchange = function () {
        const opt = this.options[this.selectedIndex];
        document.getElementById('violationName').textContent = opt.dataset.violation || '—';
        document.getElementById('violationHours').textContent = opt.dataset.hours ? `${opt.dataset.hours} hours` : '—';
        document.getElementById('violationDeadline').textContent = opt.dataset.deadline ? formatDate(opt.dataset.deadline) : '—';
    };
}


// MODALS
function showPenaltyModal(penalty) {
    const modal = document.getElementById('penaltyModal');
    document.getElementById('modalViolation').textContent = penalty.violation || 'N/A';
    document.getElementById('modalServiceType').textContent = penalty.service_type || 'Community Service';
    document.getElementById('modalHours').textContent = `${penalty.hours} hours`;

    // Check if this is a first offense (warning only)
    const isWarning = penalty.offense_level === '1st Offense' || penalty.is_warning === true;

    // Map status for display
    let displayStatus = penalty.status || 'Pending';
    if (isWarning) {
        displayStatus = 'Warning Only';
    } else if (displayStatus.toLowerCase() === 'pending' || displayStatus === 'Pending') {
        displayStatus = 'Pending';
    } else if (displayStatus.toLowerCase() === 'in-progress' || displayStatus.toLowerCase() === 'active') {
        displayStatus = 'In Progress';
    } else if (displayStatus.toLowerCase() === 'completed' || displayStatus === 'Completed') {
        displayStatus = 'Completed';
    } else if (displayStatus.toLowerCase() === 'resolved' || displayStatus === 'Resolved') {
        displayStatus = 'Resolved';
    }
    document.getElementById('modalStatus').textContent = displayStatus;

    document.getElementById('modalDateIssued').textContent = formatDate(penalty.created_at);
    document.getElementById('modalDeadline').textContent = formatDate(penalty.deadline);

    const cleanDesc = cleanDescription(penalty.notes || penalty.description, penalty.violation);
    document.getElementById('modalDescription').textContent = cleanDesc;

    modal.classList.add('show');
}

function showAppealModal(appeal) {
    const modal = document.getElementById('reasonModal');
    const header = document.getElementById('modalHeader');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalTitle');

    document.getElementById('modalViolationDetail').textContent = appeal.penalty_violation || appeal.violation || '—';
    document.getElementById('modalSubmitted').textContent = formatDate(appeal.created_at);
    const reviewedAt = appeal.reviewed_at || appeal.updated_at || appeal.approved_at || null;
    const reviewedBy = appeal.reviewed_by || appeal.approved_by || appeal.admin_name || '—';
    const adjustedHours = appeal.adjusted_hours || appeal.penalty_hours || null;
    const newDeadline = appeal.new_deadline || appeal.penalty_deadline || null;
    const decisionReason = appeal.decision_reason || appeal.reason || 'No reason provided.';
    const reviewComments = appeal.review_comment || appeal.admin_comment || appeal.comments || 'No additional comments.';

    document.getElementById('modalReviewed').textContent = reviewedAt ? formatDate(reviewedAt) : '—';
    document.getElementById('modalReviewedBy').textContent = reviewedBy;
    document.getElementById('modalAdjustedHours').textContent = adjustedHours ? `${adjustedHours} hours` : '—';
    document.getElementById('modalNewDeadline').textContent = newDeadline ? formatDate(newDeadline) : '—';
    document.getElementById('modalDecisionReason').textContent = decisionReason;
    document.getElementById('modalReviewComments').textContent = reviewComments;

    const status = appeal.status || 'pending';
    if (status === 'approved' || status === 'Approved') {
        header.className = 'reason-modal-header approved';
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>';
        title.textContent = 'Appeal Approved';
    } else if (status === 'rejected' || status === 'Rejected') {
        header.className = 'reason-modal-header rejected';
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
        title.textContent = 'Appeal Rejected';
    } else {
        header.className = 'reason-modal-header pending';
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
        title.textContent = 'Appeal Pending';
    }
    modal.classList.add('show');
}

// APPEAL SUBMISSION
async function submitAppeal() {
    const select = document.getElementById('penaltySelect');
    const reason = document.getElementById('appealReason');
    const statement = document.getElementById('supportingStatement');

    if (!select.value) { showToast('Please select a penalty to appeal', 'error'); return; }
    if (!reason.value.trim()) { showToast('Please provide a reason for your appeal', 'error'); return; }

    const penalty = myPenalties.find(p => p.id == select.value);
    if (!penalty) { showToast('Invalid penalty selected', 'error'); return; }

    const btn = document.getElementById('submitAppealBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" style="animation:spin 0.8s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Submitting...';
    btn.disabled = true;

    try {
        const studentIdValue = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
        const { error } = await supabaseClient
            .from('appeals')
            .insert([{
                student_id: studentIdValue,
                student_name: currentStudent.name,
                student_email: currentStudent.email || '',
                penalty_id: penalty.id,
                penalty_violation: penalty.violation,
                penalty_hours: penalty.hours,
                penalty_deadline: penalty.deadline,
                appeal_reason: reason.value.trim(),
                supporting_statement: statement.value.trim() || null,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);
        if (error) throw error;

        showToast('Appeal submitted successfully!', 'success');
        select.value = '';
        reason.value = '';
        statement.value = '';
        document.getElementById('violationName').textContent = '—';
        document.getElementById('violationHours').textContent = '—';
        document.getElementById('violationDeadline').textContent = '—';
        await loadAppeals();
        renderAppeal();
    } catch (e) {
        console.error('Error submitting appeal:', e);
        showToast('Failed to submit appeal. Please try again.', 'error');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}


//SETTING
async function saveProfile() {
    const name = document.getElementById('fullName').value.trim();
    if (!name) { showAlert('Please enter your name', 'error'); return; }
    try {
        const studentId = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
        await supabaseClient.from('students').update({ name }).eq('student_id_number', studentId);
        currentStudent.name = name;
        localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        showAlert('Profile updated successfully!', 'success');
        loadStudentInfo();
    } catch (e) { showAlert('Error saving profile', 'error'); }
}

async function changePassword() {
    const current = document.getElementById('modalCurrentPassword').value;
    const newPw = document.getElementById('modalNewPassword').value;
    const confirm = document.getElementById('modalConfirmPassword').value;
    if (!current || !newPw || !confirm) { showAlert('Please fill in all password fields', 'error'); return; }
    if (newPw.length < 6) { showAlert('New password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirm) { showAlert('New passwords do not match', 'error'); return; }

    try {
        const studentId = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
        const { data } = await supabaseClient.from('students').select('password').eq('student_id_number', studentId).single();
        await supabaseClient.from('students').update({ password: newPw }).eq('student_id_number', studentId);
        showAlert('Password updated successfully!', 'success');
        document.getElementById('securityModal').classList.remove('active');
        document.getElementById('modalCurrentPassword').value = '';
        document.getElementById('modalNewPassword').value = '';
        document.getElementById('modalConfirmPassword').value = '';
    } catch (e) { showAlert('Error changing password', 'error'); }
}

function saveNotificationSettings() {
    const settings = {
        email: document.getElementById('modalEmailNotif').checked,
        penalty: document.getElementById('modalPenaltyNotif').checked,
        appeal: document.getElementById('modalAppealNotif').checked,
        deadline: document.getElementById('modalDeadlineNotif').checked
    };
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    showAlert('Notification preferences saved!', 'success');
    document.getElementById('notificationModal').classList.remove('active');
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('student_language', lang);
    document.getElementById('currentLanguageDisplay').textContent = lang;
    document.getElementById('languageModal').classList.remove('active');
    showAlert(`Language changed to ${lang}`, 'success');
}

// DARK MODE
function initDarkMode() {
    const saved = localStorage.getItem('docst_dark_mode');
    const isDark = saved === 'enabled';
    document.body.classList.toggle('dark-mode', isDark);
    document.getElementById('darkModeSetting').checked = isDark;
    updateDarkModeIcon(isDark);
}

function updateDarkModeIcon(isDark) {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    btn.innerHTML = isDark ?
        '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>' :
        '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
    document.getElementById('darkModeSetting').checked = isDark;
    updateDarkModeIcon(isDark);
}

// CONFIRM MODAL
function showConfirm(title, message, onConfirm) {
    const overlay = document.getElementById('confirmModal');
    if (!overlay) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'confirmModal';
        modal.style.zIndex = '100001';   // <-- ensure it's above notification modal
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 id="confirmTitle">${title}</h3>
                    <button class="modal-close" id="confirmModalClose">
                        <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body"><p id="confirmMessage">${message}</p></div>
                <div class="modal-footer">
                    <button class="btn-cancel" id="confirmCancelBtn">Cancel</button>
                    <button class="btn-save" id="confirmOkBtn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        showConfirm(title, message, onConfirm);
        return;
    }

    // Force a high z-index every time it opens
    overlay.style.zIndex = '100001';

    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    overlay.classList.add('active');

    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    const closeBtn = document.getElementById('confirmModalClose');

    const cleanup = () => {
        overlay.classList.remove('active');
        okBtn.removeEventListener('click', handler);
        cancelBtn.removeEventListener('click', cleanup);
        closeBtn.removeEventListener('click', cleanup);
    };

    const handler = () => {
        cleanup();
        if (onConfirm) onConfirm();
    };

    okBtn.addEventListener('click', handler);
    cancelBtn.addEventListener('click', cleanup);
    closeBtn.addEventListener('click', cleanup);
}

// EXPORT PENALTIES
function exportPenaltiesData() {
    if (!myPenalties.length) {
        showToast('No data to export', 'You have no penalties recorded', 'warning');
        return;
    }

    const headers = ['Date', 'Violation', 'Service Type', 'Hours', 'Status', 'Deadline', 'Offense Level'];
    const rows = myPenalties.map(p => [
        formatDate(p.created_at),
        p.violation || 'N/A',
        p.service_type || 'Community Service',
        p.hours || 0,
        p.status || 'Pending',
        formatDate(p.deadline),
        p.offense_level || 'N/A'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saocst_penalties_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Export complete!', 'Your penalties data has been downloaded.', 'success');
}

// REFRESH FUNCTIONS
async function refreshDashboard() {
    setLoadingState('dashboardStatsContent', 'dashboardStatsSkeleton', true);
    setLoadingState('actionCardsContent', 'actionCardsSkeleton', true);
    setLoadingState('recentPenaltiesContent', 'recentPenaltiesSkeleton', true);
    setLoadingState('offenseSummaryContent', 'offenseSummarySkeleton', true);

    try {
        await loadPenalties();
        await loadAppeals();
        await loadNotifications();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }

    renderDashboard();

    setLoadingState('dashboardStatsContent', 'dashboardStatsSkeleton', false);
    setLoadingState('actionCardsContent', 'actionCardsSkeleton', false);
    setLoadingState('recentPenaltiesContent', 'recentPenaltiesSkeleton', false);
    setLoadingState('offenseSummaryContent', 'offenseSummarySkeleton', false);
}

async function refreshPenalties() {
    setLoadingState('penaltiesStatsContent', 'penaltiesStatsSkeleton', true);
    setLoadingState('penaltyProgressContent', 'penaltyProgressSkeleton', true);
    setLoadingState('penaltiesTableContent', 'penaltiesTableSkeleton', true);

    try {
        await loadPenalties();
    } catch (error) {
        console.error('Error loading penalties:', error);
    }

    renderPenalties();

    setLoadingState('penaltiesStatsContent', 'penaltiesStatsSkeleton', false);
    setLoadingState('penaltyProgressContent', 'penaltyProgressSkeleton', false);
    setLoadingState('penaltiesTableContent', 'penaltiesTableSkeleton', false);
}

async function refreshHistory() {
    setLoadingState('historyStatsContent', 'historyStatsSkeleton', true);

    try {
        await loadPenalties();
        await loadAppeals();
    } catch (error) {
        console.error('Error loading history data:', error);
    }

    renderHistory();

    setLoadingState('historyStatsContent', 'historyStatsSkeleton', false);
}

async function refreshAppeal() {
    setLoadingState('appealFormContent', 'appealFormSkeleton', true);
    setLoadingState('recentAppealsContent', 'recentAppealsSkeleton', true);

    try {
        await loadPenalties();
        await loadAppeals();
    } catch (error) {
        console.error('Error loading appeal data:', error);
    }

    renderAppeal();

    setLoadingState('appealFormContent', 'appealFormSkeleton', false);
    setLoadingState('recentAppealsContent', 'recentAppealsSkeleton', false);
}

async function refreshAll() {
    await loadPenalties();
    await loadAppeals();
    await loadNotifications();
}

// UI SETUP
function loadStudentInfo() {
    const nameEl = document.getElementById('drawerStudentName');
    const avatarEl = document.getElementById('avatarInitials');
    const idEl = document.getElementById('drawerStudentId');
    const emailEl = document.getElementById('email');
    const studentIdEl = document.getElementById('studentId');
    const fullNameEl = document.getElementById('fullName');
    const nameDisplayEl = document.getElementById('studentNameDisplay');
    const greetingEl = document.getElementById('greetingText');

    if (!currentStudent) {
        return;
    }

    const studentId = currentStudent.student_id_number || 'N/A';
    const studentName = currentStudent.name || 'Student';
    const studentEmail = currentStudent.email || '';

    if (nameEl) nameEl.textContent = studentName;
    if (nameDisplayEl) nameDisplayEl.textContent = studentName;
    if (fullNameEl) fullNameEl.value = studentName;
    if (avatarEl) avatarEl.textContent = getStudentInitials(studentName);
    if (greetingEl) greetingEl.textContent = getGreeting();

    if (idEl) {
        idEl.textContent = 'ID: ' + studentId;
        idEl.style.display = 'inline-flex';
        idEl.style.alignItems = 'center';
        idEl.style.gap = '6px';
        idEl.style.padding = '4px 12px';
        idEl.style.borderRadius = '20px';
        idEl.style.background = 'rgba(37, 99, 235, 0.15)';
        idEl.style.color = '#2563eb';
        idEl.style.fontSize = '12px';
        idEl.style.fontWeight = '600';
        idEl.style.border = '1px solid rgba(37, 99, 235, 0.2)';
        idEl.style.marginTop = '4px';
    }

    if (studentIdEl) {
        studentIdEl.value = studentId;
        studentIdEl.disabled = true;
    }

    if (emailEl) {
        emailEl.value = studentEmail;
        emailEl.disabled = true;
    }

    updateDateTime();
}

function setupDrawer() {
    const navMain = document.getElementById('drawerNavMain');
    if (!navMain) return;
    const tabs = [
        { tab: 'dashboard', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>', label: 'Dashboard' },
        { tab: 'penalties', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>', label: 'Penalties' },
        { tab: 'history', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', label: 'History' },
        { tab: 'appeal', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', label: 'Appeal' },
    ];
    navMain.innerHTML = tabs.map(t =>
        `<button class="drawer-item ${t.tab === 'dashboard' ? 'active' : ''}" data-tab="${t.tab}">${t.icon} <span class="item-label">${t.label}</span></button>`
    ).join('');

    document.querySelectorAll('.drawer-item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// EVENT INITIALIZATION
function initEvents() {
    // Hamburger
    document.getElementById('hamburgerBtn').addEventListener('click', () => {
        document.getElementById('drawer').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('open');
    });
    document.getElementById('overlay').addEventListener('click', () => {
        document.getElementById('drawer').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    });
    document.getElementById('drawerClose').addEventListener('click', () => {
        document.getElementById('drawer').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    });

    // Dark Mode
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeSetting').addEventListener('change', toggleDarkMode);

    // Action cards
    document.querySelectorAll('.action-card[data-tab]').forEach(el => {
        el.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });
    document.querySelectorAll('.warning-action-btn[data-tab]').forEach(el => {
        el.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });

    // Notification
    document.getElementById('notifyBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        const modal = document.getElementById('notificationModalOverlay');
        if (modal) {
            modal.classList.add('active');
            loadNotifications();
        }
    });
    document.getElementById('notificationModalClose').addEventListener('click', () => {
        document.getElementById('notificationModalOverlay').classList.remove('active');
    });
    document.getElementById('notificationModalCloseBtn').addEventListener('click', () => {
        document.getElementById('notificationModalOverlay').classList.remove('active');
    });
    document.getElementById('notificationModalOverlay').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('active');
    });
    document.getElementById('markAllReadBtn').addEventListener('click', async function (e) {
        e.stopPropagation();
        await markAllAsRead();
        renderNotificationList();
    });

    // Appeal
    document.getElementById('submitAppealBtn').addEventListener('click', submitAppeal);
    document.getElementById('cancelBtn').addEventListener('click', function () {
        document.getElementById('penaltySelect').value = '';
        document.getElementById('appealReason').value = '';
        document.getElementById('supportingStatement').value = '';
        document.getElementById('violationName').textContent = '—';
        document.getElementById('violationHours').textContent = '—';
        document.getElementById('violationDeadline').textContent = '—';
    });

    // Penalties Filters
    document.getElementById('penaltyStatusFilter').addEventListener('change', renderPenalties);
    document.getElementById('penaltySearchInput').addEventListener('input', renderPenalties);
    document.getElementById('penaltySortFilter').addEventListener('change', renderPenalties);
    document.getElementById('clearPenaltyFilters').addEventListener('click', function () {
        document.getElementById('penaltyStatusFilter').value = 'all';
        document.getElementById('penaltySearchInput').value = '';
        document.getElementById('penaltySortFilter').value = 'date-desc';
        renderPenalties();
        showToast('Filters cleared', 'All filters have been reset', 'info');
    });
    document.getElementById('exportPenaltiesData').addEventListener('click', exportPenaltiesData);

    // Modals - Close
    document.getElementById('closePenaltyModal').addEventListener('click', () => document.getElementById('penaltyModal').classList.remove('show'));
    document.getElementById('modalCloseBtn').addEventListener('click', () => document.getElementById('penaltyModal').classList.remove('show'));
    document.getElementById('modalCloseBtnTop').addEventListener('click', () => document.getElementById('reasonModal').classList.remove('show'));
    document.getElementById('modalCloseFooterBtn').addEventListener('click', () => document.getElementById('reasonModal').classList.remove('show'));
    document.getElementById('reasonModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });

    // Settings - Profile
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);

    // Settings - Language
    document.getElementById('langSetting').addEventListener('click', () => document.getElementById('languageModal').classList.add('active'));
    document.getElementById('langModalClose').addEventListener('click', () => document.getElementById('languageModal').classList.remove('active'));
    document.querySelectorAll('#languageModal .language-option').forEach(el => {
        el.addEventListener('click', function () { setLanguage(this.dataset.lang); });
    });

    // Settings - Security
    document.getElementById('securitySetting').addEventListener('click', () => document.getElementById('securityModal').classList.add('active'));
    document.getElementById('secModalClose').addEventListener('click', () => document.getElementById('securityModal').classList.remove('active'));
    document.getElementById('secModalCancel').addEventListener('click', () => document.getElementById('securityModal').classList.remove('active'));
    document.getElementById('secModalSave').addEventListener('click', changePassword);

    // Settings - Notification
    document.getElementById('notifSetting').addEventListener('click', function () {
        const saved = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        document.getElementById('modalEmailNotif').checked = saved.email !== false;
        document.getElementById('modalPenaltyNotif').checked = saved.penalty !== false;
        document.getElementById('modalAppealNotif').checked = saved.appeal !== false;
        document.getElementById('modalDeadlineNotif').checked = saved.deadline !== false;
        document.getElementById('notificationModal').classList.add('active');
    });
    document.getElementById('notifModalClose').addEventListener('click', () => document.getElementById('notificationModal').classList.remove('active'));
    document.getElementById('notifModalCancel').addEventListener('click', () => document.getElementById('notificationModal').classList.remove('active'));
    document.getElementById('notifModalSave').addEventListener('click', saveNotificationSettings);

    // Settings - FAQ & About
    document.getElementById('faqSetting').addEventListener('click', () => showAlert('FAQ: Check your penalties in the Penalties tab. Submit appeals from the Appeal tab. Contact the Discipline Office for more help.', 'info'));
    document.getElementById('aboutSetting').addEventListener('click', () => showAlert('SAOCST v1.0.0 - Student Affairs Office Community Service Tracker. Gordon College, Olongapo City.', 'info'));

    // Settings - Logout
    document.getElementById('logoutSetting').addEventListener('click', () => {
        showConfirm('Logout', 'Are you sure you want to logout?', () => {
            localStorage.removeItem('currentStudent');
            window.location.href = '/Assets/Student_Authentication/Student.html';
        });
    });

    // Settings - Delete Account
    document.getElementById('deleteSetting').addEventListener('click', () => {
        showConfirm('Delete Account', 'WARNING: This action is permanent. All your data will be deleted. Are you sure?', () => {
            showConfirm('Confirm Deletion', 'Type "DELETE" to confirm:', () => {
                (async function () {
                    try {
                        const studentId = currentStudent.student_id_number || currentStudent.studentId || currentStudent.id;
                        await supabaseClient.from('students').delete().eq('student_id_number', studentId);
                        localStorage.clear();
                        showAlert('Account deleted. Redirecting...', 'success');
                        setTimeout(() => window.location.href = '/Assets/Landing/index.html', 2000);
                    } catch (e) {
                        localStorage.clear();
                        window.location.href = '/Assets/Landing/index.html';
                    }
                })();
            });
        });
    });

    // Confirm modal
    document.getElementById('confirmModalClose').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('active'));
    document.getElementById('confirmCancelBtn').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('active'));

    // Logout button in drawer
    document.getElementById('logoutBtn').addEventListener('click', () => {
        showConfirm('Logout', 'Are you sure you want to logout?', () => {
            localStorage.removeItem('currentStudent');
            window.location.href = '/Assets/Student_Authentication/Student.html';
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active, .penalty-modal.show, .reason-modal-overlay.show').forEach(modal => {
                modal.classList.remove('active', 'show');
            });
        }
    });
}


// AUTO LOGOUT - IDLE TIMER


// Configuration
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
let idleTimer = null;
let logoutWarningTimer = null;
let isLogoutWarningShown = false;

// Function to reset the idle timer
function resetIdleTimer() {
    clearTimeout(idleTimer);
    clearTimeout(logoutWarningTimer);
    isLogoutWarningShown = false;
    hideLogoutWarning();

    // Start the timer
    idleTimer = setTimeout(() => {
        showLogoutWarning();
    }, IDLE_TIMEOUT);
}

// Function to show logout warning
function showLogoutWarning() {
    if (isLogoutWarningShown) return;
    isLogoutWarningShown = true;

    // Create warning overlay
    const overlay = document.createElement('div');
    overlay.id = 'logoutWarningOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div class="logout-warning-modal" style="
            background: var(--surface, #ffffff);
            border-radius: 20px;
            max-width: 440px;
            width: 90%;
            padding: 32px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.3);
            animation: slideUp 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
            text-align: center;
        ">
            <div style="
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: #fef2f2;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            ">
                <svg class="icon-svg" viewBox="0 0 24 24" style="width: 36px; height: 36px; stroke: #dc2626; fill: none;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h3 style="
                font-size: 22px;
                font-weight: 700;
                color: var(--text, #0f172a);
                margin-bottom: 8px;
            ">Session Expiring Soon</h3>
            <p style="
                font-size: 15px;
                color: var(--text-2, #475569);
                margin-bottom: 24px;
                line-height: 1.6;
            ">
                You've been inactive for a while. Your session will expire in <strong id="logoutCountdown">30</strong> seconds.
                <br>
                <span style="font-size: 13px; color: var(--text-3, #94a3b8);">Click "Stay Logged In" to continue your session.</span>
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="stayLoggedIn()" style="
                    padding: 12px 32px;
                    border-radius: 12px;
                    border: none;
                    background: var(--blue, #2563EB);
                    color: #ffffff;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    flex: 1;
                ">Stay Logged In</button>
                <button onclick="performLogout()" style="
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: 1px solid var(--border, #e2e8f0);
                    background: transparent;
                    color: var(--text-2, #475569);
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                ">Logout</button>
            </div>
            <div style="
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid var(--border, #e2e8f0);
            ">
                <p style="
                    font-size: 12px;
                    color: var(--text-3, #94a3b8);
                    margin: 0;
                ">
                    You will be automatically logged out to protect your account.
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Add styles if not already present
    if (!document.getElementById('logoutWarningStyles')) {
        const style = document.createElement('style');
        style.id = 'logoutWarningStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px) scale(0.96); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .logout-warning-modal button:hover {
                transform: translateY(-2px);
            }
            .logout-warning-modal button:first-child:hover {
                box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
                background: var(--blue-dark, #1D4ED8);
            }
            .logout-warning-modal button:last-child:hover {
                background: var(--bg, #f1f5f9);
            }
            body.dark-mode .logout-warning-modal {
                background: #1e293b;
            }
            body.dark-mode .logout-warning-modal h3 {
                color: #f1f5f9;
            }
            body.dark-mode .logout-warning-modal p {
                color: #94a3b8;
            }
            body.dark-mode .logout-warning-modal button:last-child {
                border-color: #334155;
                color: #94a3b8;
            }
            body.dark-mode .logout-warning-modal button:last-child:hover {
                background: #334155;
            }
            body.dark-mode .logout-warning-modal div:first-child {
                background: #7f1d1d;
            }
        `;
        document.head.appendChild(style);
    }

    // Start countdown
    let seconds = 30;
    const countdownEl = document.getElementById('logoutCountdown');

    logoutWarningTimer = setInterval(() => {
        seconds--;
        if (countdownEl) {
            countdownEl.textContent = seconds;
        }
        if (seconds <= 0) {
            clearInterval(logoutWarningTimer);
            performLogout();
        }
    }, 1000);

    // Make functions globally accessible
    window.stayLoggedIn = stayLoggedIn;
    window.performLogout = performLogout;
}

// Function to hide logout warning
function hideLogoutWarning() {
    const overlay = document.getElementById('logoutWarningOverlay');
    if (overlay) {
        overlay.remove();
    }
    clearInterval(logoutWarningTimer);
    isLogoutWarningShown = false;
}

// Function to stay logged in
function stayLoggedIn() {
    hideLogoutWarning();
    resetIdleTimer();
    showToast('Session extended', 'You will remain logged in', 'success');
}

// Function to perform logout
function performLogout() {
    hideLogoutWarning();
    clearTimeout(idleTimer);
    clearInterval(logoutWarningTimer);

    // Clear session data
    localStorage.removeItem('currentStudent');
    sessionStorage.clear();

    if (typeof supabase !== 'undefined' && supabase) {
        try {
            supabase.auth.signOut();
        } catch (e) { }
    }

    showToast('Logged out', 'You have been logged out due to inactivity.', 'warning');

    // Redirect to login page
    setTimeout(() => {
        window.location.href = '/Assets/Student_Authentication/Student.html';
    }, 1500);
}


// ACTIVITY DETECTION


// Events that reset the idle timer
const activityEvents = [
    'mousemove',
    'mousedown',
    'click',
    'scroll',
    'keydown',
    'touchstart',
    'touchmove',
    'wheel',
    'resize'
];

// Function to setup activity listeners
function setupActivityListeners() {
    // Remove existing listeners to avoid duplicates
    activityEvents.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
    });

    // Add listeners
    activityEvents.forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Also listen for focus/visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resetIdleTimer();
        }
    });
}

// Function to initialize auto-logout
function initAutoLogout() {
    resetIdleTimer();
    setupActivityListeners();
}


// INITIALIZATION
async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    loadStudentInfo();
    initDarkMode();
    setupDrawer();
    initEvents();

    await refreshAll();
    switchTab('dashboard');

    updateDateTime();

    document.getElementById('currentLanguageDisplay').textContent = currentLanguage;

    window.switchTab = switchTab;
    window.currentTab = currentTab;

    const greeting = getGreeting();
    const greetingElement = document.getElementById('greetingText');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
    document.getElementById('clearAllNotifBtn')?.addEventListener('click', function (e) {
        e.stopPropagation();
        clearAllNotifications();
    });

    // Initialize auto-logout
    initAutoLogout();
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}