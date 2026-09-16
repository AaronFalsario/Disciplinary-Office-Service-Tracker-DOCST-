import { createClient } from '@supabase/supabase-js';

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

let currentAdmin = null;
let students = [];
let penalties = [];
let appeals = [];
let chartInstances = {};
let notifications = [];
let unreadCount = 0;
let countdownInterval;
let isManualLogout = false; // FIXED: Added missing variable

// Helper to remove skeleton class
function revealElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('skeleton');
}

// AUTO LOGOUT SYSTEM (5 Minutes of Inactivity)
function performLogout(message) {
    isManualLogout = true;
    localStorage.removeItem('currentAdmin');
    localStorage.removeItem('adminSessionExpiry');
    localStorage.removeItem('rememberedAdmin');
    localStorage.removeItem('adminSession');
    sessionStorage.clear();
    if (typeof supabase !== 'undefined' && supabase) {
        try { supabase.auth.signOut(); } catch (e) { }
    }
    alert(message || 'You have been logged out.');
    window.location.href = '/Assets/Student_Authentication/Admin_Authentication/AdminLogin.html?expired=true';
}

window.addEventListener('beforeunload', function (e) {
    if (isManualLogout) {
        clearTimeout(logoutTimer);
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('adminSessionExpiry');
        localStorage.removeItem('rememberedAdmin');
        localStorage.removeItem('adminSession');
        sessionStorage.clear();
        if (typeof supabase !== 'undefined' && supabase) {
            try { supabase.auth.signOut(); } catch (e) { }
        }
    }
});

window.addEventListener('pagehide', function (e) {
    if (isManualLogout) {
        clearTimeout(logoutTimer);
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('adminSessionExpiry');
        localStorage.removeItem('rememberedAdmin');
        localStorage.removeItem('adminSession');
        sessionStorage.clear();
        if (typeof supabase !== 'undefined' && supabase) {
            try { supabase.auth.signOut(); } catch (e) { }
        }
    }
});

window.addEventListener('load', function () {
    const session = localStorage.getItem('currentAdmin');
    if (!session) {
        window.location.href = '/Assets/Student_Authentication/Admin_Authentication/AdminLogin.html';
    }
    isManualLogout = false;
});

// TOAST SYSTEM
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // If message is a valid type, shift parameters
    if (typeof message === 'string' && ['info', 'success', 'error', 'warning'].includes(message)) {
        type = message;
        message = '';
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconPaths = {
        success: '<polyline points="20 6 9 17 4 12"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        warning: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    };
    toast.innerHTML = `
        <div class="toast-icon"><svg class="icon-svg" viewBox="0 0 24 24">${iconPaths[type] || iconPaths.info}</svg></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    setTimeout(() => toast.remove(), 5000);
}

// MODAL SYSTEM
function createModal(title, bodyHTML, footerHTML, options = {}) {
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

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
        padding: 20px;
    `;

    overlay.innerHTML = `
        <div class="modal" style="
            background: var(--surface, #ffffff);
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 0;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
            position: relative;
        ">
            <div class="modal-header" style="
                padding: 20px 24px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--border, #e2e8f0);
                position: sticky;
                top: 0;
                background: var(--surface, #ffffff);
                z-index: 10;
                border-radius: 16px 16px 0 0;
            ">
                <h2 style="font-size: 20px; font-weight: 700; color: var(--text, #0f172a); margin: 0;">${title}</h2>
                <button class="modal-close" style="
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s ease;
                    width: 36px;
                    height: 36px;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 24px; height: 24px; stroke: var(--text-2, #475569); fill: none;">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                ${bodyHTML}
            </div>
            ${footerHTML ? `<div class="modal-footer" style="
                padding: 16px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-top: 1px solid var(--border, #e2e8f0);
                background: var(--bg, #f8fafc);
                border-radius: 0 0 16px 16px;
                position: sticky;
                bottom: 0;
            ">${footerHTML}</div>` : ''}
        </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.modal-close');
    const closeModal = () => {
        overlay.remove();
        if (options.onClose) options.onClose();
    };

    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Add escape key listener
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    return {
        overlay,
        close: closeModal,
        getElement: () => overlay.querySelector('.modal'),
        getBody: () => overlay.querySelector('.modal-body'),
        getFooter: () => overlay.querySelector('.modal-footer')
    };
}

// GENERATE STUDENT ID
function generateStudentId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const count = students.length + 1;
    const sequential = String(count).padStart(6, '0');
    return `${year}${sequential}`;
}

// CSV EXPORT HELPER
function exportToCSV(rows, filename) {
    if (!rows || rows.length === 0) {
        showToast('Nothing to export', 'There is no data available to export yet', 'warning');
        return;
    }
    const headers = Object.keys(rows[0]);
    const escapeCell = (val) => {
        const s = val === null || val === undefined ? '' : String(val);
        return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(h => escapeCell(row[h])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Export complete', `${filename} has been downloaded`, 'success');
}

// DESTROY CHARTS
function destroyCharts() {
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            try { chart.destroy(); } catch (e) { }
        }
    });
    chartInstances = {};
}

// COUNTDOWN TIMER FUNCTIONS
function calculateRemainingTime(penalty) {
    if (!penalty) return null;
    if (penalty.status === 'Completed' || penalty.status === 'Resolved') return null;
    if (penalty.status !== 'in-progress' && penalty.status !== 'Active') return null;
    if (!penalty.hours || penalty.hours <= 0) return null;
    if (!penalty.started_at) return null;

    const startTime = new Date(penalty.started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalSeconds = penalty.hours * 3600;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    if (remainingSeconds <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, completed: true };
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return { hours, minutes, seconds, completed: false };
}

function formatCountdown(time) {
    if (!time) return '—';
    if (time.completed) return 'Complete!';
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
}

function calculateProgress(penalty) {
    if (!penalty || !penalty.hours || penalty.hours <= 0) return 0;
    if (penalty.status === 'Completed' || penalty.status === 'Resolved') return 100;
    if (penalty.status !== 'in-progress' && penalty.status !== 'Active') return 0;

    const startTime = penalty.started_at ? new Date(penalty.started_at) : new Date(penalty.created_at || Date.now());
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalSeconds = penalty.hours * 3600;
    const percentage = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
    return Math.round(percentage);
}

function updateCountdownTimers() {
    const timerElements = document.querySelectorAll('.countdown-timer');
    timerElements.forEach(el => {
        const penaltyId = parseInt(el.dataset.penaltyId);
        const penalty = penalties.find(p => p.id === penaltyId);
        if (!penalty) return;

        const time = calculateRemainingTime(penalty);
        if (time) {
            el.textContent = formatCountdown(time);
            el.className = `countdown-timer ${time.completed ? 'completed' : ''}`;

            const row = el.closest('tr');
            if (row) {
                const progressBar = row.querySelector('.countdown-progress');
                if (progressBar) {
                    const progress = calculateProgress(penalty);
                    progressBar.style.width = `${Math.min(100, progress)}%`;
                    progressBar.style.background = progress >= 100 ? '#10b981' : '#2563eb';
                }

                if (time.completed && penalty.status !== 'Completed') {
                    autoCompletePenalty(penalty.id);
                }
            }
        } else {
            el.textContent = '—';
        }
    });
}

async function autoCompletePenalty(id) {
    try {
        const { data, error } = await supabaseClient
            .from('penalties')
            .update({
                status: 'Completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error auto-completing penalty:', error);
            return;
        }

        if (data && data.length > 0) {
            const penalty = data[0];
            const index = penalties.findIndex(p => p.id === id);
            if (index !== -1) {
                penalties[index] = penalty;
            }

            await createNotification({
                student_id: penalty.student_id,
                title: 'Community Service Complete!',
                message: `Congratulations! Your ${penalty.hours}-hour community service for "${penalty.violation_type}" is now complete.`,
                type: 'penalty'
            });

            refreshPenalties();
            refreshDashboard();
            loadNotifications();
        }
    } catch (e) {
        console.error('Error in autoCompletePenalty:', e);
    }
}

function startCountdownTimers() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdownTimers, 1000);
}

// NAVIGATION
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const themeToggle = document.getElementById('themeToggle');
const settingsThemeBtn = document.getElementById('settingsThemeBtn');
const body = document.body;
const pages = {
    dashboard: document.getElementById('page-dashboard'),
    penalties: document.getElementById('page-penalties'),
    students: document.getElementById('page-students'),
    appeals: document.getElementById('page-appeals'),
    reports: document.getElementById('page-reports'),
    settings: document.getElementById('page-settings')
};

function navigate(page) {
    Object.values(pages).forEach(p => { if (p) p.classList.add('hidden-page'); });
    if (pages[page]) pages[page].classList.remove('hidden-page');
    document.querySelectorAll('.drawer-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    if (window.innerWidth <= 768) drawer.classList.remove('open');

    const taglineMap = {
        dashboard: 'Discipline Office',
        penalties: 'Penalties Management',
        students: 'Student Management',
        appeals: 'Appeals Management',
        reports: 'Reports & Analytics',
        settings: 'Settings'
    };
    const taglineEl = document.querySelector('.brand-tagline');
    if (taglineEl) taglineEl.textContent = taglineMap[page] || 'Discipline Office';

    if (page === 'dashboard') refreshDashboard();
    else if (page === 'penalties') refreshPenalties();
    else if (page === 'students') refreshStudents();
    else if (page === 'appeals') refreshAppeals();
    else if (page === 'reports') refreshReports();
}

// THEME
function setTheme(dark) {
    body.classList.toggle('dark-mode', dark);
    const icon = themeToggle?.querySelector('.icon-svg');
    if (icon) {
        icon.setAttribute('viewBox', dark ? '0 0 24 24' : '0 0 24 24');
        icon.innerHTML = dark ?
            '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' :
            '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
    const themeLabel = document.getElementById('currentThemeLabel');
    if (themeLabel) themeLabel.textContent = dark ? 'Dark' : 'Light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}

if (themeToggle) themeToggle.addEventListener('click', () => setTheme(!body.classList.contains('dark-mode')));
if (settingsThemeBtn) settingsThemeBtn.addEventListener('click', () => setTheme(!body.classList.contains('dark-mode')));
if (localStorage.getItem('theme') === 'dark') setTheme(true);

// DATE DISPLAY
function updateDateTime() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}
updateDateTime();
setInterval(updateDateTime, 1000);

// LOGOUT
document.getElementById('logoutDrawerBtn').addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'logout-modal';
    modal.innerHTML = `
        <div class="logout-modal-content">
            <div class="logout-modal-header">
                <svg class="icon-svg" viewBox="0 0 24 24">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <h3>Logout</h3>
            </div>
            <div class="logout-modal-body">
                <p>Are you sure you want to log out?</p>
                <div class="logout-modal-warning">
                    <svg class="icon-svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    You will be redirected to the login page.
                </div>
            </div>
            <div class="logout-modal-footer">
                <button class="logout-modal-cancel" id="logoutCancel">Cancel</button>
                <button class="logout-modal-confirm" id="logoutConfirm">Logout</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('logoutCancel').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('logoutConfirm').addEventListener('click', () => {
        modal.remove();
        performLogout('You have been logged out successfully.');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.querySelector('.logout-modal');
        if (modal) {
            modal.remove();
        }
    }
});

// FETCH ADMIN NAME
async function fetchAdminName() {
    try {
        const storedAdmin = localStorage.getItem('currentAdmin');
        if (storedAdmin) {
            try {
                const admin = JSON.parse(storedAdmin);
                if (admin && (admin.full_name || admin.name)) {
                    currentAdmin = admin;
                    updateAdminUI(admin);
                    return;
                }
            } catch (e) { }
        }

        const { data, error } = await supabaseClient
            .from('admins')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching admin:', error);
            return;
        }

        if (data) {
            currentAdmin = data;
            localStorage.setItem('currentAdmin', JSON.stringify(data));
            updateAdminUI(data);
        } else {
            updateAdminUI({ full_name: 'Admin User', name: 'Admin', role: 'Discipline Officer' });
        }
    } catch (error) {
        console.error('Error fetching admin name:', error);
    }
}

function updateAdminUI(admin) {
    const adminName = admin.full_name || admin.name || 'Admin User';
    const adminRole = admin.role || admin.position || 'Discipline Officer';
    const adminInitial = adminName.charAt(0).toUpperCase();

    const drawerName = document.getElementById('drawerAdminName');
    const drawerRole = document.getElementById('drawerAdminRole');
    const drawerAvatar = document.getElementById('drawerAvatarLetter');
    const adminNameDisplay = document.getElementById('adminNameDisplay');
    const topbarName = document.getElementById('topbarAdminName');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const currentAdminNameEl = document.getElementById('currentAdminName');

    if (drawerName) drawerName.textContent = adminName;
    if (drawerRole) drawerRole.textContent = adminRole;
    if (drawerAvatar) drawerAvatar.textContent = adminInitial;
    if (adminNameDisplay) adminNameDisplay.textContent = adminName;
    if (topbarName) topbarName.textContent = adminName;

    if (welcomeTitle) {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        if (hour >= 18) greeting = 'Good evening';
        const greetingSpan = document.getElementById('greetingText');
        if (greetingSpan) greetingSpan.textContent = greeting;
    }

    if (currentAdminNameEl) currentAdminNameEl.textContent = adminName;
    updateTotalAdmins();
}

async function updateTotalAdmins() {
    try {
        const { count, error } = await supabaseClient
            .from('admins')
            .select('*', { count: 'exact', head: true });

        if (!error) {
            const totalAdminsEl = document.getElementById('totalAdmins');
            if (totalAdminsEl) totalAdminsEl.textContent = count || 1;
        }
    } catch (e) {
        console.error('Error counting admins:', e);
    }
}

// SETUP DRAWER
function setupDrawer() {
    const navMain = document.getElementById('drawerNavMain');
    if (!navMain) {
        console.error('drawerNavMain not found!');
        return;
    }

    navMain.innerHTML = '';

    const items = [
        { page: 'dashboard', icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>', label: 'Dashboard' },
        { page: 'penalties', icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>', label: 'Penalties' },
        { page: 'students', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', label: 'Students' },
        { page: 'appeals', icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>', label: 'Appeals' },
        { page: 'reports', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', label: 'Reports' },
    ];

    items.forEach(item => {
        const button = document.createElement('button');
        button.className = `drawer-item${item.page === 'dashboard' ? ' active' : ''}`;
        button.dataset.page = item.page;
        button.innerHTML = `
            <svg class="icon-svg" viewBox="0 0 24 24">${item.icon}</svg>
            <span class="item-label">${item.label}</span>
        `;
        button.addEventListener('click', () => navigate(button.dataset.page));
        navMain.appendChild(button);
    });
}

// HAMBURGER
if (hamburger) {
    hamburger.addEventListener('click', () => {
        drawer.classList.toggle('open');
        hamburger.classList.toggle('active');
    });
}

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!drawer.contains(e.target) && !hamburger.contains(e.target)) {
            drawer.classList.remove('open');
            hamburger.classList.remove('active');
        }
    }
});

document.getElementById('drawerClose').addEventListener('click', () => {
    drawer.classList.remove('open');
    hamburger.classList.remove('active');
});

// BOTTOM NAV
document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// NOTIFICATIONS
const notifyBtn = document.getElementById('notificationBtn');
const notifyModalOverlay = document.getElementById('notificationModalOverlay');
const notifyModalClose = document.getElementById('notificationModalClose');
const notifyModalCloseBtn = document.getElementById('notificationModalCloseBtn');
const markAllReadBtn = document.getElementById('markAllReadBtn');
const notificationModalBody = document.getElementById('notificationModalBody');

function showNotificationsModal() {
    if (notifyModalOverlay) {
        notifyModalOverlay.classList.add('active');
        renderNotificationList();
    }
}

async function loadNotifications() {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error loading notifications:', error);
            notifications = [];
        } else {
            notifications = data || [];
            if (notifications.length === 0) {
                console.log('No notifications found');
            }
        }

        unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationBadge();
        renderNotificationList();

        // Update count in header
        const countEl = document.getElementById('notificationCount');
        if (countEl) {
            if (unreadCount > 0) {
                countEl.textContent = unreadCount;
                countEl.style.display = 'inline-block';
            } else {
                countEl.textContent = '0';
                countEl.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Error loading notifications:', e);
        notifications = [];
        unreadCount = 0;
        updateNotificationBadge();
        renderNotificationList();
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const countEl = document.getElementById('notificationCount');

    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    if (countEl) {
        if (unreadCount > 0) {
            countEl.textContent = unreadCount;
            countEl.style.display = 'inline-block';
        } else {
            countEl.textContent = '0';
            countEl.style.display = 'none';
        }
    }
}

// Clear all notifications
async function clearAllNotifications() {
    if (notifications.length === 0) {
        showToast('No notifications', 'Nothing to clear', 'info');
        return;
    }

    // Build our own confirm dialog — no dependency on #confirmModal
    const overlay = document.createElement('div');
    overlay.id = 'clearAllConfirmOverlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.25s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background: var(--surface, #ffffff);
            border-radius: 16px;
            max-width: 440px;
            width: 100%;
            padding: 0;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
            overflow: hidden;
            animation: slideUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
        ">
            <div style="
                padding: 20px 24px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid var(--border, #e2e8f0);
            ">
                <div style="
                    width: 40px; height: 40px; border-radius: 50%;
                    background: #fef2f2;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 22px; height: 22px; stroke: #dc2626; fill: none;">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <div>
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text, #0f172a); margin: 0;">
                        Clear All Notifications
                    </h3>
                    <p style="font-size: 14px; color: var(--text-2, #475569); margin: 4px 0 0;">
                        Are you sure you want to delete all notifications? This action cannot be undone.
                    </p>
                </div>
            </div>
            <div style="
                padding: 16px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--bg, #f8fafc);
            ">
                <button id="clearAllCancelBtn" style="
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: 1px solid var(--border, #e2e8f0);
                    background: var(--surface, #ffffff);
                    color: var(--text-2, #475569);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: inherit;
                ">Cancel</button>
                <button id="clearAllConfirmBtn" style="
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: none;
                    background: #dc2626;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: inherit;
                ">Clear All</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeOverlay = () => {
        overlay.remove();
    };

    const cancelBtn = overlay.querySelector('#clearAllCancelBtn');
    const confirmBtn = overlay.querySelector('#clearAllConfirmBtn');

    cancelBtn.addEventListener('click', closeOverlay);

    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Clearing…';

        try {
            const ids = notifications
                .map(n => n.id)
                .filter(id => id !== undefined && id !== null);

            if (ids.length === 0) {
                closeOverlay();
                showToast('No notifications', 'Nothing to clear', 'info');
                return;
            }

            console.log('Deleting notification IDs:', ids);

            const { error } = await supabaseClient
                .from('notifications')
                .delete()
                .in('id', ids);

            if (error) {
                console.error('Supabase delete error:', error);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Clear All';
                showToast('Error', `Failed to clear: ${error.message}`, 'error');
                return;
            }

            notifications = [];
            unreadCount = 0;
            updateNotificationBadge();
            renderNotificationList();

            const countEl = document.getElementById('notificationCount');
            if (countEl) {
                countEl.textContent = '0';
                countEl.style.display = 'none';
            }

            closeOverlay();

            if (notifyModalOverlay) {
                notifyModalOverlay.classList.remove('active');
            }

            showToast('Cleared', 'All notifications cleared', 'success');

        } catch (e) {
            console.error('Error in clearAll:', e);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Clear All';
            showToast('Error', 'Unexpected error while clearing', 'error');
        }
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeOverlay();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

async function deleteNotification(id) {
    try {
        const idStr = String(id);

        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting notification:', error);
            showToast('Error', 'Failed to delete notification', 'error');
            return;
        }

        notifications = notifications.filter(n => String(n.id) !== idStr);
        unreadCount = notifications.filter(n => !n.is_read).length;

        updateNotificationBadge();
        renderNotificationList();

        const countEl = document.getElementById('notificationCount');
        if (countEl) {
            if (unreadCount > 0) {
                countEl.textContent = unreadCount;
                countEl.style.display = 'inline-block';
            } else {
                countEl.textContent = '0';
                countEl.style.display = 'none';
            }
        }

        showToast('Deleted', 'Notification removed', 'success');
    } catch (e) {
        console.error('Error deleting notification:', e);
        showToast('Error', 'Failed to delete notification', 'error');
    }
}

document.getElementById('clearAllNotificationsBtn')?.addEventListener('click', async function (e) {
    e.stopPropagation();
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="font-size: 12px;">Clearing…</span>';
    try {
        await clearAllNotifications();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

function renderNotificationList() {
    if (!notificationModalBody) return;

    // Update count in header
    const countEl = document.getElementById('notificationCount');
    if (countEl) {
        const unread = notifications.filter(n => !n.is_read).length;
        if (unread > 0) {
            countEl.textContent = unread;
            countEl.style.display = 'inline-block';
        } else {
            countEl.textContent = '0';
            countEl.style.display = 'none';
        }
    }

    if (!notifications.length) {
        notificationModalBody.innerHTML = `
            <div class="empty-notifications">
                <svg class="icon-svg" viewBox="0 0 24 24" style="width: 48px; height: 48px; color: var(--text-3); opacity: 0.4; margin-bottom: 12px;">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p style="font-size: 16px; font-weight: 500; color: var(--text);">No notifications</p>
                <span style="font-size: 13px; color: var(--text-3);">You're all caught up!</span>
            </div>
        `;
        return;
    }

    notificationModalBody.innerHTML = notifications.map(n => `
        <div class="notification-item ${!n.is_read ? 'unread' : ''}" data-id="${n.id}">
            <div class="n-icon ${n.type || 'system'}">
                <svg class="icon-svg" viewBox="0 0 24 24">${getNotificationIcon(n.type)}</svg>
            </div>
            <div class="n-content">
                <div class="n-title">${escapeHtml(n.title)}</div>
                <div class="n-message">${escapeHtml(n.message)}</div>
                <div class="n-time">${formatRelativeTime(new Date(n.created_at))}</div>
            </div>
            <div class="n-actions">
                ${!n.is_read ? '<div class="n-dot"></div>' : ''}
    <button class="n-delete-btn" data-id="${n.id}" title="Dismiss notification" style="
    background: transparent;
    border: none;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
" onmouseover="this.style.background='#fef2f2'; this.style.color='#dc2626';"
    onmouseout="this.style.background='transparent'; this.style.color='#94a3b8';">
    <svg class="icon-svg" viewBox="0 0 24 24" style="
        width: 16px;
        height: 16px;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        fill: none;
    ">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('#notificationModalBody .notification-item').forEach(item => {
        const deleteBtn = item.querySelector('.n-delete-btn');

        item.addEventListener('click', async function (e) {
            if (e.target.closest('.n-delete-btn')) return;
            const id = this.dataset.id;
            const notification = notifications.find(n => String(n.id) === String(id));
            if (notification && !notification.is_read) {
                await markAsRead(id);
            }
            renderNotificationList();
        });

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const id = this.dataset.id;
                await deleteNotification(id);
            });
        }
    });
}

function getNotificationIcon(type) {
    switch (type) {
        case 'penalty':
            return '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>';
        case 'appeal':
            return '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>';
        case 'deadline':
            return '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
        case 'system':
            return '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
        default:
            return '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(date) {
    if (!date) return 'Just now';
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

async function markAsRead(id) {
    try {
        const notification = notifications.find(n => String(n.id) === String(id));
        if (!notification) {
            console.error('Notification not found:', id);
            return;
        }

        const { data, error } = await supabaseClient
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Database error:', error);
            showToast('Error', 'Failed to mark notification as read', 'error');
            return;
        }

        const updated = data && data[0];
        if (updated) {
            const index = notifications.findIndex(n => n.id === id);
            if (index !== -1) {
                notifications[index] = updated;
            }
            unreadCount = notifications.filter(n => !n.is_read).length;
            updateNotificationBadge();
            renderNotificationList();
            showToast('Notification marked as read', 'info');
        } else {
            if (!notification.is_read) {
                notification.is_read = true;
                unreadCount = notifications.filter(n => !n.is_read).length;
                updateNotificationBadge();
                renderNotificationList();
                showToast('Notification marked as read', 'info');
            }
        }
    } catch (e) {
        console.error('Error marking as read:', e);
        showToast('Error', 'Failed to mark notification as read', 'error');
    }
}

async function markAllAsRead() {
    if (unreadCount === 0) {
        showToast('No unread notifications', '', 'info');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('is_read', false)
            .select();

        if (error) {
            console.error('Database error:', error);
            showToast('Error', 'Failed to mark all as read', 'error');
            return;
        }

        notifications.forEach(n => n.is_read = true);
        unreadCount = 0;
        updateNotificationBadge();
        renderNotificationList();
        showToast('All notifications marked as read', '', 'success');
    } catch (e) {
        console.error('Error marking all as read:', e);
        showToast('Error', 'Failed to mark all as read', 'error');
    }
}

if (notifyBtn) {
    notifyBtn.addEventListener('click', async () => {
        if (notifyModalOverlay) {
            notifyModalOverlay.classList.add('active');
            renderNotificationList();
            await loadNotifications();
        }
    });
}

if (notifyModalClose) {
    notifyModalClose.addEventListener('click', () => {
        notifyModalOverlay.classList.remove('active');
    });
}

if (notifyModalCloseBtn) {
    notifyModalCloseBtn.addEventListener('click', () => {
        notifyModalOverlay.classList.remove('active');
    });
}

if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', markAllAsRead);
}

if (notifyModalOverlay) {
    notifyModalOverlay.addEventListener('click', (e) => {
        if (e.target === notifyModalOverlay) {
            notifyModalOverlay.classList.remove('active');
        }
    });
}

// NOTIFICATION CREATOR
async function createNotification(notificationData) {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .insert([{
                admin_id: notificationData.admin_id || null,
                student_id: notificationData.student_id || null,
                title: notificationData.title || 'New Notification',
                message: notificationData.message || '',
                type: notificationData.type || 'system',
                is_read: false,
                created_at: new Date().toISOString(),
                read_at: null
            }])
            .select();

        if (error) {
            console.error('Error creating notification:', error);
            return null;
        }

        await loadNotifications();

        return data ? data[0] : null;
    } catch (e) {
        console.error('Error creating notification:', e);
        return null;
    }
}

// DASHBOARD REFRESH
async function refreshDashboard() {
    try {
        const [studentsRes, penaltiesRes, appealsRes] = await Promise.all([
            supabaseClient.from('students').select('*'),
            supabaseClient.from('penalties').select('*'),
            supabaseClient.from('appeals').select('*')
        ]);

        students = studentsRes.data || [];
        penalties = penaltiesRes.data || [];
        appeals = appealsRes.data || [];

        const totalStudents = students.length;
        const totalViolations = penalties.length;
        const pendingAppeals = appeals.filter(a => (a.status || '').toLowerCase() === 'pending').length;
        const approvedAppeals = appeals.filter(a => (a.status || '').toLowerCase() === 'approved').length;

        revealElement('statStudents');
        revealElement('statViolations');
        revealElement('statPendingAppeals');
        revealElement('statApprovedAppeals');
        revealElement('totalCases');
        revealElement('inProgress');
        revealElement('resolved');
        revealElement('complianceRate');
        revealElement('activeStudents');
        revealElement('pendingReviews');
        revealElement('resolutionLabel');
        revealElement('appealLabel');
        revealElement('studentLabel');

        document.getElementById('statStudents').textContent = totalStudents;
        document.getElementById('statViolations').textContent = totalViolations;
        document.getElementById('statPendingAppeals').textContent = pendingAppeals;
        document.getElementById('statApprovedAppeals').textContent = approvedAppeals;

        document.getElementById('totalCases').textContent = totalViolations + appeals.length;
        document.getElementById('inProgress').textContent = pendingAppeals;
        document.getElementById('resolved').textContent = approvedAppeals + penalties.filter(p => p.status === 'Resolved').length;
        document.getElementById('complianceRate').textContent =
            totalStudents > 0 ? `${Math.round((totalStudents - penalties.filter(p => p.status === 'Active').length) / totalStudents * 100)}%` : '0%';
        document.getElementById('activeStudents').textContent = students.filter(s => s.status === 'Good').length;
        document.getElementById('pendingReviews').textContent = pendingAppeals;

        const recentViolations = penalties.slice(0, 5);
        const tbody = document.getElementById('recentViolationsBody');
        if (recentViolations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><span class="text-muted">No violations recorded</span></td></tr>';
        } else {
            tbody.innerHTML = recentViolations.map(v => `
                <tr>
                    <td>${v.student_name || 'Unknown'}</td>
                    <td>${v.violation_type || 'N/A'}</td>
                    <td>${v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td><span class="status-badge status-${v.status?.toLowerCase() || 'pending'}">${v.status || 'Pending'}</span></td>
                </tr>
            `).join('');
        }

        const activities = [
            ...penalties.map(p => ({
                text: `Violation recorded: ${p.violation_type || 'N/A'}`,
                time: p.created_at,
                type: 'penalty'
            })),
            ...appeals.map(a => {
                const reason = a.appeal_reason || a.reason || a.supporting_statement || 'No reason provided';
                const status = a.status || 'Pending';
                return {
                    text: `Appeal ${status}: ${reason}`,
                    time: a.created_at,
                    type: 'appeal'
                };
            })
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

        const activityContainer = document.getElementById('activityContainer');
        if (activities.length === 0) {
            activityContainer.innerHTML = '<div class="text-muted" style="padding:12px 0;">No recent activity</div>';
        } else {
            activityContainer.innerHTML = activities.map(a => `
                <div class="timeline-item">
                    <div class="timeline-dot ${a.type === 'penalty' ? 'red' : 'green'}"></div>
                    <div class="timeline-content">
                        <div class="timeline-text">${a.text}</div>
                        <div class="timeline-time">${formatRelativeTime(new Date(a.time))}</div>
                    </div>
                </div>
            `).join('');
        }
        document.getElementById('activityCount').textContent = `${activities.length} events`;

        const violationCounts = {};
        penalties.forEach(p => {
            const name = p.student_name || 'Unknown';
            violationCounts[name] = (violationCounts[name] || 0) + 1;
        });
        const topStudents = Object.entries(violationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const topStudentsList = document.getElementById('topStudentsList');
        if (topStudents.length === 0) {
            topStudentsList.innerHTML = '<div class="text-muted" style="padding:12px 0;">No violations recorded</div>';
        } else {
            topStudentsList.innerHTML = topStudents.map(([name, count]) => `
                <div class="violation-item">
                    <span class="violation-name">${name}</span>
                    <span class="violation-count">${count} violations</span>
                </div>
            `).join('');
        }

        const recentAppeals = appeals.slice(0, 5);
        const recentAppealsList = document.getElementById('recentAppealsList');
        if (recentAppeals.length === 0) {
            recentAppealsList.innerHTML = '<div class="text-muted" style="padding:12px 0;">No appeals submitted</div>';
        } else {
            recentAppealsList.innerHTML = recentAppeals.map(a => {
                // Try every possible field name the appeal might use
                const violation = a.penalty_violation
                    || a.violation
                    || a.violation_type
                    || 'Unknown violation';

                const reason = a.appeal_reason
                    || a.reason
                    || a.supporting_statement
                    || 'No reason provided';

                const student = a.student_name || 'Unknown student';
                const submitted = a.created_at
                    ? new Date(a.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                    })
                    : 'Date N/A';

                const rawStatus = (a.status || 'pending').toString().toLowerCase();
                const statusLabel = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

                const hours = a.penalty_hours
                    ? `${a.penalty_hours} hrs`
                    : (a.adjusted_hours ? `${a.adjusted_hours} hrs` : '');

                return `
            <div class="violation-item recent-appeal-item" style="
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                padding: 10px 0;
                border-bottom: 1px solid var(--border, #e2e8f0);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    gap: 8px;
                ">
                    <span class="violation-name" style="
                        font-weight: 600;
                        color: var(--text, #0f172a);
                        flex: 1;
                        min-width: 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">
                        ${student}
                    </span>
                    <span class="status-badge status-${rawStatus}" style="
                        flex-shrink: 0;
                        font-size: 11px;
                        padding: 3px 10px;
                    ">${statusLabel}</span>
                </div>
                <div style="
                    font-size: 13px;
                    color: var(--text-2, #475569);
                    width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                ">
                    <strong>${violation}</strong>
                    ${hours ? ` · ${hours}` : ''}
                </div>
                <div style="
                    font-size: 12px;
                    color: var(--text-3, #94a3b8);
                    width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                ">
                    "${reason}"
                </div>
                <div style="
                    font-size: 11px;
                    color: var(--text-3, #94a3b8);
                ">
                    Submitted ${submitted}
                </div>
            </div>
        `;
            }).join('');
        }

        updateProgressRings();
        updateCharts();

    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

// UPDATE PROGRESS RINGS
function updateProgressRings() {
    const totalViolations = penalties.length;
    const resolvedViolations = penalties.filter(p => p.status === 'Resolved').length;
    const resolutionRate = totalViolations > 0 ? Math.round((resolvedViolations / totalViolations) * 100) : 0;

    const totalAppeals = appeals.length;
    const approvedAppeals = appeals.filter(a => (a.status || '').toLowerCase() === 'approved').length;
    const appealSuccessRate = totalAppeals > 0 ? Math.round((approvedAppeals / totalAppeals) * 100) : 0;

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Good').length;
    const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

    revealElement('resolutionLabel');
    revealElement('appealLabel');
    revealElement('studentLabel');

    document.getElementById('resolutionLabel').textContent = `${resolutionRate}%`;
    document.getElementById('appealLabel').textContent = `${appealSuccessRate}%`;
    document.getElementById('studentLabel').textContent = `${engagementRate}%`;

    const circumference = 201;
    const updateRing = (ringId, percentage) => {
        const ring = document.getElementById(ringId);
        if (!ring) return;
        const circle = ring.querySelector('.ring-fg');
        if (circle) {
            circle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
        }
    };

    updateRing('resolutionRing', resolutionRate);
    updateRing('appealRing', appealSuccessRate);
    updateRing('studentRing', engagementRate);
}

// UPDATE CHARTS
function updateCharts() {
    destroyCharts();

    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    if (trendCtx) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthData = new Array(12).fill(0);
        penalties.forEach(p => {
            if (p.created_at) {
                const month = new Date(p.created_at).getMonth();
                monthData[month]++;
            }
        });
        chartInstances.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Violations',
                    data: monthData,
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2563EB'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
    if (categoryCtx) {
        const categories = ['Academic', 'Behavior', 'Attendance', 'Uniform', 'Other'];
        const categoryCounts = categories.map(cat =>
            penalties.filter(p => (p.category || 'Other') === cat).length
        );
        chartInstances.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: categoryCounts,
                    backgroundColor: ['#2563EB', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
                }
            }
        });
    }

    const weeklyCtx = document.getElementById('weeklyChart')?.getContext('2d');
    if (weeklyCtx) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyData = new Array(7).fill(0);
        penalties.forEach(p => {
            if (p.created_at) {
                const day = new Date(p.created_at).getDay();
                const idx = day === 0 ? 6 : day - 1;
                weeklyData[idx]++;
            }
        });
        chartInstances.weekly = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Violations',
                    data: weeklyData,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: '#2563EB',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const courseCtx = document.getElementById('courseChart')?.getContext('2d');
    if (courseCtx) {
        const courses = ['BSIT', 'BSCS', 'BSBA', 'BSED', 'BSN'];
        const courseCounts = courses.map(course =>
            students.filter(s => s.course === course).length
        );
        chartInstances.course = new Chart(courseCtx, {
            type: 'bar',
            data: {
                labels: courses,
                datasets: [{
                    label: 'Students',
                    data: courseCounts,
                    backgroundColor: ['#2563EB', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const approvalCtx = document.getElementById('approvalChart')?.getContext('2d');
    if (approvalCtx) {
        const approved = appeals.filter(a => (a.status || '').toLowerCase() === 'approved').length;
        const rejected = appeals.filter(a => (a.status || '').toLowerCase() === 'rejected').length;
        const pending = appeals.filter(a => (a.status || '').toLowerCase() === 'pending').length;
        chartInstances.approval = new Chart(approvalCtx, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Rejected', 'Pending'],
                datasets: [{
                    data: [approved, rejected, pending],
                    backgroundColor: ['#10B981', '#DC2626', '#F59E0B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
                }
            }
        });
    }

    // FIXED: Penalty Distribution Chart - using offense_level instead of level
    const penaltyCtx = document.getElementById('penaltyChart')?.getContext('2d');
    if (penaltyCtx) {
        const levels = ['1st Offense', '2nd Offense', '3rd Offense'];
        const levelCounts = levels.map(level =>
            penalties.filter(p => p.offense_level === level).length
        );
        chartInstances.penalty = new Chart(penaltyCtx, {
            type: 'pie',
            data: {
                labels: ['1st Offense', '2nd Offense', '3rd Offense'],
                datasets: [{
                    data: levelCounts,
                    backgroundColor: ['#10B981', '#F59E0B', '#DC2626'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
                }
            }
        });
    }
}

// PENALTIES REFRESH WITH STUDENT NAME AND COUNTDOWN
async function refreshPenalties() {
    try {
        const { data } = await supabaseClient.from('penalties').select('*').order('created_at', { ascending: false });
        penalties = data || [];

        document.getElementById('totalPenalties').textContent = penalties.length;
        document.getElementById('activePenalties').textContent = penalties.filter(p => p.status === 'Active' || p.status === 'in-progress').length;
        document.getElementById('inactivePenalties').textContent = penalties.filter(p => p.status === 'Inactive' || p.status === 'Completed' || p.status === 'Resolved').length;
        document.getElementById('severePenalties').textContent = penalties.filter(p => p.offense_level === '3rd Offense').length;

        const tbody = document.getElementById('penaltiesTableBody');
        const search = document.getElementById('penaltySearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('penaltyCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('penaltyStatusFilter')?.value || '';

        let filtered = penalties;
        if (search) {
            filtered = filtered.filter(p =>
                p.student_name?.toLowerCase().includes(search) ||
                p.violation_type?.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search)
            );
        }
        if (categoryFilter) {
            filtered = filtered.filter(p => (p.category || '') === categoryFilter);
        }
        if (statusFilter) {
            filtered = filtered.filter(p => (p.status || '') === statusFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><span class="text-muted">No penalties found</span></td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const time = calculateRemainingTime(p);
            const timerDisplay = time ? formatCountdown(time) : '—';
            const progress = (time && !time.completed) ? calculateProgress(p) : 0;

            const isWarning = p.is_warning === true || p.offense_level === '1st Offense';
            const isInProgress = p.status === 'in-progress' || p.status === 'Active';
            const isCompleted = p.status === 'Completed' || p.status === 'Resolved';

            let statusText = p.status || 'Active';
            let statusClass = 'status-pending';

            if (isWarning) {
                statusText = 'Warning';
                statusClass = 'status-pending';
            } else if (isCompleted) {
                statusText = 'Resolved';
                statusClass = 'status-completed';
            } else if (isInProgress) {
                statusText = 'In Progress';
                statusClass = 'status-progress';
            } else {
                statusClass = 'status-rejected';
            }

            let cleanDescription = p.description || '—';
            if (cleanDescription.includes(' - ')) {
                const parts = cleanDescription.split(' - ');
                if (parts.length > 1) {
                    const secondPart = parts[1];
                    if (secondPart.includes('hours') || secondPart.includes('Warning') || secondPart.includes('Service')) {
                        cleanDescription = parts[0];
                    }
                }
            }

            let penaltyDisplay = '—';
            if (isWarning) {
                penaltyDisplay = 'Warning';
            } else if (p.penalty) {
                penaltyDisplay = p.penalty;
            } else if (p.offense_level === '2nd Offense') {
                penaltyDisplay = '5 hrs Community Service';
            } else if (p.offense_level === '3rd Offense') {
                penaltyDisplay = '10 hrs Community Service';
            }

            let levelDisplay = p.level || 'Minor';
            let levelClass = 'status-completed';
            if (levelDisplay === 'Severe') {
                levelClass = 'status-rejected';
            } else if (levelDisplay === 'Moderate') {
                levelClass = 'status-progress';
            }

            const showTimer = isInProgress && p.hours > 0 && !isWarning && p.started_at !== null;

            return `
            <tr>
                <td><strong>${p.student_name || 'Unknown'}</strong></td>
                <td>${p.violation_type || 'N/A'}</td>
                <td>${cleanDescription}</td>
                <td><span class="status-badge ${levelClass}">${levelDisplay}</span></td>
                <td>${penaltyDisplay}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${showTimer ? `
                        <div class="countdown-container" style="margin-top: 4px;">
                            <div class="countdown-timer" data-penalty-id="${p.id}" style="font-size: 12px; font-weight: 600; ${time?.completed ? 'color: #10b981;' : 'color: #2563eb;'}">
                                ${timerDisplay}
                            </div>
                            <div class="progress-bar-container" style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 4px; margin-top: 2px; overflow: hidden;">
                                <div class="countdown-progress" style="width: ${Math.min(100, progress)}%; height: 100%; background: ${progress >= 100 ? '#10b981' : '#2563eb'}; transition: width 1s ease;"></div>
                            </div>
                        </div>
                    ` : ''}
                    ${isWarning ? '<div style="font-size: 11px; color: #f59e0b; margin-top: 2px;">⚠️ Warning Only</div>' : ''}
                </td>
                <td>${p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn-sm blue" onclick="editPenalty(${p.id})"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                        <button class="icon-btn-sm red" onclick="deletePenalty(${p.id})"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        ${isInProgress && !isWarning ? `
                            <button class="icon-btn-sm green" onclick="markPenaltyComplete(${p.id})" title="Mark as Complete"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `}).join('');

        startCountdownTimers();

    } catch (error) {
        console.error('Error refreshing penalties:', error);
    }
}

// MARK PENALTY AS COMPLETE
window.markPenaltyComplete = async (id) => {
    if (!confirm('Mark this penalty as completed?')) return;

    try {
        const { data, error } = await supabaseClient
            .from('penalties')
            .update({
                status: 'Completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            const penalty = data[0];

            await createNotification({
                student_id: penalty.student_id,
                title: 'Community Service Complete',
                message: `Congratulations! Your community service for "${penalty.violation_type}" is now complete.`,
                type: 'penalty'
            });

            showToast('Success', 'Penalty marked as complete', 'success');
            refreshPenalties();
            refreshDashboard();
            loadNotifications();
        }
    } catch (error) {
        console.error('Error marking penalty complete:', error);
        showToast('Error', 'Failed to mark penalty as complete', 'error');
    }
};

// STUDENTS REFRESH
async function refreshStudents() {
    try {
        const { data } = await supabaseClient.from('students').select('*').order('name', { ascending: true });
        students = data || [];

        document.getElementById('totalStudentsCount').textContent = students.length;
        document.getElementById('goodStanding').textContent = students.filter(s => s.status === 'Good').length;
        document.getElementById('probationCount').textContent = students.filter(s => s.status === 'Probation').length;
        document.getElementById('suspendedCount').textContent = students.filter(s => s.status === 'Suspended').length;

        const tbody = document.getElementById('studentsTableBody');
        const search = document.getElementById('studentSearch')?.value.toLowerCase() || '';
        const courseFilter = document.getElementById('studentCourseFilter')?.value || '';
        const statusFilter = document.getElementById('studentStatusFilter')?.value || '';

        let filtered = students;
        if (search) {
            filtered = filtered.filter(s =>
                s.name?.toLowerCase().includes(search) ||
                s.student_id_number?.toLowerCase().includes(search) ||
                s.email?.toLowerCase().includes(search)
            );
        }
        if (courseFilter) {
            filtered = filtered.filter(s => (s.course || '') === courseFilter);
        }
        if (statusFilter) {
            filtered = filtered.filter(s => (s.status || '') === statusFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><span class="text-muted">No students found</span></td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td><strong>${s.student_id_number || '—'}</strong></td>
                <td>${s.name || 'Unknown'}</td>
                <td>${s.course || '—'}</td>
                <td>${s.year_level || '—'}</td>
                <td>${s.violation_count || 0}</td>
                <td><span class="status-badge ${s.status === 'Good' ? 'status-completed' : s.status === 'Probation' ? 'status-progress' : 'status-rejected'}">${s.status || 'Good'}</span></td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn-sm blue" onclick="viewStudent('${s.id}')"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        <button class="icon-btn-sm amber" onclick="editStudent('${s.id}')"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                        <button class="icon-btn-sm red" onclick="deleteStudent('${s.id}')"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error refreshing students:', error);
    }
}

// APPEALS REFRESH
async function refreshAppeals() {
    try {
        const { data } = await supabaseClient.from('appeals').select('*').order('created_at', { ascending: false });
        appeals = data || [];

        document.getElementById('totalAppeals').textContent = appeals.length;
        document.getElementById('pendingAppealsCount').textContent = appeals.filter(a => (a.status || '').toLowerCase() === 'pending').length;
        document.getElementById('approvedAppealsCount').textContent = appeals.filter(a => (a.status || '').toLowerCase() === 'approved').length;
        document.getElementById('rejectedAppealsCount').textContent = appeals.filter(a => (a.status || '').toLowerCase() === 'rejected').length;

        const tbody = document.getElementById('appealsTableBody');
        const search = document.getElementById('appealSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('appealStatusFilter')?.value || '';
        const dateFilter = document.getElementById('appealDateFilter')?.value || '';

        let filtered = appeals;
        if (search) {
            filtered = filtered.filter(a =>
                a.student_name?.toLowerCase().includes(search) ||
                (a.penalty_violation || a.violation || a.violation_type || '')?.toLowerCase().includes(search) ||
                (a.appeal_reason || a.reason || '')?.toLowerCase().includes(search)
            );
        }
        if (statusFilter) {
            filtered = filtered.filter(a => (a.status || '') === statusFilter);
        }
        if (dateFilter === 'Today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(a => new Date(a.created_at).toDateString() === today);
        } else if (dateFilter === 'This Week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo);
        } else if (dateFilter === 'This Month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            filtered = filtered.filter(a => new Date(a.created_at) >= monthAgo);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;"><span class="text-muted">No appeals found</span></td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(a => {
            const violation = a.penalty_violation || a.violation || a.violation_type || '—';

            return `
            <tr>
                <td><strong>#${a.id}</strong></td>
                <td>${a.student_name || 'Unknown'}</td>
                <td>${violation}</td>
                <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                <td><span class="status-badge ${a.status === 'Approved' ? 'status-approved' : a.status === 'Rejected' ? 'status-rejected' : 'status-pending'}">${a.status || 'Pending'}</span></td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn-sm blue" onclick="viewAppeal(${a.id})"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        ${a.status === 'Pending' ? `
                            <button class="icon-btn-sm green" onclick="approveAppeal(${a.id})"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
                            <button class="icon-btn-sm red" onclick="rejectAppeal(${a.id})"><svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `}).join('');

    } catch (error) {
        console.error('Error refreshing appeals:', error);
    }
};

// REPORTS REFRESH
async function refreshReports() {
    try {
        const [studentsRes, penaltiesRes, appealsRes] = await Promise.all([
            supabaseClient.from('students').select('*'),
            supabaseClient.from('penalties').select('*'),
            supabaseClient.from('appeals').select('*')
        ]);

        students = studentsRes.data || [];
        penalties = penaltiesRes.data || [];
        appeals = appealsRes.data || [];

        const totalCases = penalties.length + appeals.length;
        const resolved = penalties.filter(p => p.status === 'Resolved').length + appeals.filter(a => (a.status || '').toLowerCase() === 'approved').length;
        const resolutionRate = totalCases > 0 ? Math.round((resolved / totalCases) * 100) : 0;
        const avgPenalty = penalties.length > 0 ? Math.round(penalties.reduce((sum, p) => sum + (p.hours || 0), 0) / penalties.length) : 0;

        document.getElementById('reportTotalCases').textContent = totalCases;
        document.getElementById('reportResolutionRate').textContent = `${resolutionRate}%`;
        document.getElementById('reportActiveStudents').textContent = students.filter(s => s.status === 'Good').length;
        document.getElementById('reportAvgPenalty').textContent = avgPenalty;

        updateCharts();

    } catch (error) {
        console.error('Error refreshing reports:', error);
        showToast('Error', 'Failed to load reports', 'error');
    }
}

// REFRESH STUDENTS FOR MODAL
async function refreshStudentsForModal() {
    try {
        console.log('Loading students for modal...');

        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading students for modal:', error);
            showToast('Error', 'Failed to load students: ' + error.message, 'error');
            return;
        }

        if (data && data.length > 0) {
            students = data;
            console.log('Students loaded for modal:', students.length);
            return students;
        } else {
            console.log('No students found in database');
            students = [];
            showToast('Info', 'No students found. Please add a student first.', 'info');
            return [];
        }
    } catch (e) {
        console.error('Error loading students for modal:', e);
        students = [];
        showToast('Error', 'Failed to load students. Please try again.', 'error');
        return [];
    }
}

// FIXED: OPEN ADD STUDENT MODAL
function openAddStudentModal() {
    console.log('Opening add student modal...');

    // Make sure students data is loaded
    if (students.length === 0) {
        refreshStudentsForModal();
    }

    const suggestedId = generateStudentId();
    console.log('Generated ID:', suggestedId);

    const modal = createModal('Add New Student', `
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Full Name *</label>
            <input id="newStudentName" placeholder="Enter full name" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Student ID *</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input id="newStudentId" placeholder="e.g., 26000001" value="${suggestedId}" style="flex: 1; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
                <button type="button" class="btn-generate-id" id="generateIdBtn" style="
                    padding: 8px 14px;
                    background: var(--blue-light, #eff6ff);
                    color: var(--blue, #2563eb);
                    border: 1px solid var(--border, #e2e8f0);
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: var(--transition);
                    font-family: inherit;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Generate
                </button>
            </div>
            <small style="color: var(--text-3, #94a3b8); font-size: 11px; display: block; margin-top: 4px;">
                Format: Year (2 digits) + 6-digit sequential number (e.g., 26012345)
            </small>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Email *</label>
            <input id="newStudentEmail" type="email" placeholder="student@email.com" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Course *</label>
                <select id="newStudentCourse" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSBA">BSBA</option>
                    <option value="BSED">BSED</option>
                    <option value="BSN">BSN</option>
                    <option value="BSCrim">BSCrim</option>
                    <option value="BSA">BSA</option>
                    <option value="BEED">BEED</option>
                    <option value="BSEd">BSEd</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Year Level *</label>
                <select id="newStudentYear" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                </select>
            </div>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Status</label>
            <select id="newStudentStatus" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                <option value="Good">Good Standing</option>
                <option value="Probation">Probation</option>
                <option value="Warning">Warning</option>
                <option value="Suspended">Suspended</option>
            </select>
        </div>
    `, `
        <button class="action-btn" style="padding: 10px 24px; border-radius: 10px; border: 1px solid var(--border, #e2e8f0); background: var(--surface, #ffffff); color: var(--text-2, #475569); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: inherit;">Cancel</button>
        <button class="action-btn primary" id="createStudentBtn" style="padding: 10px 24px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit;">Add Student</button>
    `);

    // Add event listener for generate ID button
    const generateBtn = modal.getElement().querySelector('#generateIdBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const newId = generateStudentId();
            document.getElementById('newStudentId').value = newId;
            showToast('New ID generated', `Student ID: ${newId}`, 'info');
        });
    }

    // Add event listener for create student button
    const createBtn = modal.getElement().querySelector('#createStudentBtn');
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const name = document.getElementById('newStudentName').value.trim();
            const studentId = document.getElementById('newStudentId').value.trim();
            const email = document.getElementById('newStudentEmail').value.trim();
            const course = document.getElementById('newStudentCourse').value;
            const year = document.getElementById('newStudentYear').value;
            const status = document.getElementById('newStudentStatus').value;

            console.log('Creating student:', { name, studentId, email, course, year, status });

            if (!name) {
                showToast('Error', 'Full name is required', 'error');
                return;
            }
            if (!studentId) {
                showToast('Error', 'Student ID is required', 'error');
                return;
            }
            if (!/^\d{8}$/.test(studentId)) {
                showToast('Error', 'Student ID must be 8 digits (e.g., 26012345)', 'error');
                return;
            }
            if (!email) {
                showToast('Error', 'Email is required', 'error');
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                showToast('Error', 'Please enter a valid email address', 'error');
                return;
            }

            // Check for duplicate student ID
            const existingStudent = students.find(s => s.student_id === studentId);
            if (existingStudent) {
                showToast('Error', `Student ID ${studentId} already exists`, 'error');
                return;
            }

            const studentData = {
                name: name,
                student_id_number: studentId,
                email: email,
                course: course,
                year_level: year,
                status: status || 'Good',
                violation_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            try {
                const { data, error } = await supabaseClient
                    .from('students')
                    .insert([studentData])
                    .select();

                if (error) {
                    console.error('Supabase error:', error);
                    showToast('Error', error.message, 'error');
                } else {
                    console.log('Student created:', data);
                    showToast('Success', `Student ${name} added successfully! ID: ${studentId}`, 'success');
                    modal.close();
                    await refreshStudents();
                    await refreshDashboard();
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                showToast('Error', 'An unexpected error occurred', 'error');
            }
        });
    }

    // Add cancel button handler
    const cancelBtn = modal.getElement().querySelector('.action-btn:not(.primary)');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modal.close());
    }

    return modal;
}

// EDIT PENALTY 
// EDIT PENALTY - COMPLETELY FIXED
window.editPenalty = async (id) => {
    const penalty = penalties.find(p => p.id === id);
    if (!penalty) {
        showToast('Error', 'Penalty not found', 'error');
        return;
    }

    await refreshStudentsForModal();

    // Build student options - USE student_id_number as the value, NOT the database id
    let studentOptions = '';
    let foundSelected = false;

    for (let i = 0; i < students.length; i++) {
        let s = students[i];
        let studentIdValue = s.student_id_number || s.student_id || s.id;
        let displayId = s.student_id_number || s.student_id || 'N/A';

        // Compare using student_id_number
        let isSelected = String(studentIdValue) === String(penalty.student_id);

        if (isSelected) {
            foundSelected = true;
        }

        studentOptions += `<option value="${studentIdValue}" ${isSelected ? 'selected' : ''}>${s.name} (${displayId})</option>`;
    }

    // If no student was found selected, try to find by name as fallback
    if (!foundSelected && penalty.student_name) {
        for (let i = 0; i < students.length; i++) {
            let s = students[i];
            if (s.name === penalty.student_name) {
                let studentIdValue = s.student_id_number || s.student_id || s.id;
                // Update the option to be selected
                studentOptions = studentOptions.replace(
                    `value="${studentIdValue}"`,
                    `value="${studentIdValue}" selected`
                );
                break;
            }
        }
    }

    const modal = createModal('Edit Penalty', `
        <div class="form-group">
            <label>Violation Type *</label>
            <select id="editPenaltyName">
                <option value="">-- Select a violation --</option>
                <option value="Academic Dishonesty" ${penalty.violation === 'Academic Dishonesty' ? 'selected' : ''}>Academic Dishonesty</option>
                <option value="Cheating" ${penalty.violation === 'Cheating' ? 'selected' : ''}>Cheating</option>
                <option value="Plagiarism" ${penalty.violation === 'Plagiarism' ? 'selected' : ''}>Plagiarism</option>
                <option value="Class Disruption" ${penalty.violation === 'Class Disruption' ? 'selected' : ''}>Class Disruption</option>
                <option value="Insubordination" ${penalty.violation === 'Insubordination' ? 'selected' : ''}>Insubordination</option>
                <option value="Bullying" ${penalty.violation === 'Bullying' ? 'selected' : ''}>Bullying</option>
                <option value="Fighting" ${penalty.violation === 'Fighting' ? 'selected' : ''}>Fighting</option>
                <option value="Vandalism" ${penalty.violation === 'Vandalism' ? 'selected' : ''}>Vandalism</option>
                <option value="Theft" ${penalty.violation === 'Theft' ? 'selected' : ''}>Theft</option>
                <option value="Tardiness" ${penalty.violation === 'Tardiness' ? 'selected' : ''}>Tardiness</option>
                <option value="Absenteeism" ${penalty.violation === 'Absenteeism' ? 'selected' : ''}>Absenteeism</option>
                <option value="Uniform Violation" ${penalty.violation === 'Uniform Violation' ? 'selected' : ''}>Uniform Violation</option>
                <option value="Cell Phone Use" ${penalty.violation === 'Cell Phone Use' ? 'selected' : ''}>Cell Phone Use</option>
                <option value="Smoking" ${penalty.violation === 'Smoking' ? 'selected' : ''}>Smoking</option>
                <option value="Alcohol/Drugs" ${penalty.violation === 'Alcohol/Drugs' ? 'selected' : ''}>Alcohol/Drugs</option>
                <option value="Other" ${penalty.violation === 'Other' ? 'selected' : ''}>Other</option>
            </select>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="editPenaltyDesc" placeholder="Detailed description">${penalty.description || ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Offense Level *</label>
                <select id="editPenaltyLevel">
                    <option value="1st Offense" ${penalty.offense_level === '1st Offense' ? 'selected' : ''}>1st Offense</option>
                    <option value="2nd Offense" ${penalty.offense_level === '2nd Offense' ? 'selected' : ''}>2nd Offense</option>
                    <option value="3rd Offense" ${penalty.offense_level === '3rd Offense' ? 'selected' : ''}>3rd Offense</option>
                </select>
            </div>
            <div class="form-group">
                <label>Community Service Hours</label>
                <div id="editPenaltyHoursDisplay" style="padding: 10px 14px; background: #f1f5f9; border-radius: 8px; border: 1px solid var(--border); color: var(--text); font-weight: 600;">
                    ${penalty.hours || 0} hours
                </div>
                <input id="editPenaltyHours" type="hidden" value="${penalty.hours || 0}" />
                <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                    Hours are automatically set based on offense level
                </small>
            </div>
        </div>
        <div class="form-group" style="background: #f0f4ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2563EB;">
            <label style="font-weight: 600; color: #1e293b;">Suggested Penalty:</label>
            <div id="editSuggestedPenaltyDisplay" style="color: #475569; margin-top: 4px; font-size: 14px;">
                ${penalty.offense_level === '1st Offense' ? 'Warning Only - No community service required' :
            penalty.offense_level === '2nd Offense' ? '5 hours Community Service + Formal Notice' :
                '10 hours Community Service + Meeting with SAO'}
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Service Type</label>
                <select id="editPenaltyServiceType">
                    <option value="Community Service" ${penalty.service_type === 'Community Service' ? 'selected' : ''}>Community Service</option>
                    <option value="Campus Cleanup" ${penalty.service_type === 'Campus Cleanup' ? 'selected' : ''}>Campus Cleanup</option>
                    <option value="Office Assistance" ${penalty.service_type === 'Office Assistance' ? 'selected' : ''}>Office Assistance</option>
                    <option value="Tutoring" ${penalty.service_type === 'Tutoring' ? 'selected' : ''}>Tutoring</option>
                    <option value="Other" ${penalty.service_type === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Deadline (Date to Report)</label>
                <input id="editPenaltyDeadline" type="date" value="${penalty.deadline || ''}" />
                <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                    The date the student must report to the office to start community service
                </small>
            </div>
        </div>
        <div class="form-group">
            <label>Status *</label>
            <select id="editPenaltyStatus">
                <option value="Pending" ${penalty.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="in-progress" ${penalty.status === 'in-progress' || penalty.status === 'Active' ? 'selected' : ''}>In Progress</option>
                <option value="Completed" ${penalty.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Resolved" ${penalty.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
            <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                Select "In Progress" to start the countdown timer
            </small>
        </div>
        <div class="form-group">
            <label>Select Student *</label>
            <select id="editPenaltyStudent">
                <option value="">-- Select a student --</option>
                ${studentOptions}
            </select>
        </div>
    `, `
        <button class="action-btn" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">Cancel</button>
        <button class="action-btn primary" id="saveEditPenaltyBtn">Save Changes</button>
    `);

    const levelSelect = modal.getElement().querySelector('#editPenaltyLevel');
    const hoursDisplay = modal.getElement().querySelector('#editPenaltyHoursDisplay');
    const serviceTypeSelect = modal.getElement().querySelector('#editPenaltyServiceType');
    const deadlineInput = modal.getElement().querySelector('#editPenaltyDeadline');
    const statusSelect = modal.getElement().querySelector('#editPenaltyStatus');
    const suggestionDisplay = modal.getElement().querySelector('#editSuggestedPenaltyDisplay');

    function updateEditSuggestion() {
        const level = levelSelect.value;
        let suggestion = '';
        let hours = 0;
        let isFirstOffense = false;

        switch (level) {
            case '1st Offense':
                suggestion = 'Warning Only - No community service required';
                hours = 0;
                isFirstOffense = true;
                break;
            case '2nd Offense':
                suggestion = '5 hours Community Service + Formal Notice';
                hours = 5;
                isFirstOffense = false;
                break;
            case '3rd Offense':
                suggestion = '10 hours Community Service + Meeting with SAO';
                hours = 10;
                isFirstOffense = false;
                break;
            default:
                suggestion = 'Warning Only';
                hours = 0;
                isFirstOffense = true;
        }

        suggestionDisplay.textContent = suggestion;
        hoursDisplay.textContent = `${hours} hours`;

        if (isFirstOffense) {
            serviceTypeSelect.disabled = true;
            serviceTypeSelect.style.cursor = 'not-allowed';
            serviceTypeSelect.style.opacity = '0.6';
            serviceTypeSelect.style.backgroundColor = '#f1f5f9';
            serviceTypeSelect.value = 'Community Service';
            deadlineInput.disabled = true;
            deadlineInput.style.cursor = 'not-allowed';
            deadlineInput.style.opacity = '0.6';
            deadlineInput.style.backgroundColor = '#f1f5f9';
            deadlineInput.value = '';
            statusSelect.value = 'Resolved';
            statusSelect.disabled = true;
            statusSelect.style.cursor = 'not-allowed';
            statusSelect.style.opacity = '0.6';
            statusSelect.style.backgroundColor = '#f1f5f9';
        } else {
            serviceTypeSelect.disabled = false;
            serviceTypeSelect.style.cursor = 'pointer';
            serviceTypeSelect.style.opacity = '1';
            serviceTypeSelect.style.backgroundColor = '';
            deadlineInput.disabled = false;
            deadlineInput.style.cursor = 'pointer';
            deadlineInput.style.opacity = '1';
            deadlineInput.style.backgroundColor = '';
            statusSelect.disabled = false;
            statusSelect.style.cursor = 'pointer';
            statusSelect.style.opacity = '1';
            statusSelect.style.backgroundColor = '';
        }
    }

    levelSelect.addEventListener('change', updateEditSuggestion);
    updateEditSuggestion();

    modal.getElement().querySelector('#saveEditPenaltyBtn').addEventListener('click', async () => {
        try {
            const violation = document.getElementById('editPenaltyName').value;
            const studentIdValue = document.getElementById('editPenaltyStudent').value;
            const deadline = document.getElementById('editPenaltyDeadline').value;
            const serviceType = document.getElementById('editPenaltyServiceType').value;
            const offenseLevel = document.getElementById('editPenaltyLevel').value;
            const description = document.getElementById('editPenaltyDesc').value.trim();
            const status = document.getElementById('editPenaltyStatus').value;

            if (!violation) {
                showToast('Error', 'Please select a violation type', 'error');
                return;
            }

            if (!studentIdValue) {
                showToast('Error', 'Please select a student', 'error');
                return;
            }

            // Find the selected student by student_id_number (the value from dropdown)
            let selectedStudent = null;
            for (let i = 0; i < students.length; i++) {
                let s = students[i];
                let sId = s.student_id_number || s.student_id || s.id;
                if (String(sId) === String(studentIdValue)) {
                    selectedStudent = s;
                    break;
                }
            }

            if (!selectedStudent) {
                showToast('Error', 'Selected student not found', 'error');
                return;
            }

            let category = 'Other';
            const academicViolations = ['Academic Dishonesty', 'Cheating', 'Plagiarism'];
            const behaviorViolations = ['Class Disruption', 'Insubordination', 'Bullying', 'Fighting'];
            const attendanceViolations = ['Tardiness', 'Absenteeism'];
            const uniformViolations = ['Uniform Violation'];

            if (academicViolations.includes(violation)) category = 'Academic';
            else if (behaviorViolations.includes(violation)) category = 'Behavior';
            else if (attendanceViolations.includes(violation)) category = 'Attendance';
            else if (uniformViolations.includes(violation)) category = 'Uniform';

            const isFirstOffense = offenseLevel === '1st Offense';
            const now = new Date().toISOString();

            let penaltyHours = 0;
            switch (offenseLevel) {
                case '1st Offense':
                    penaltyHours = 0;
                    break;
                case '2nd Offense':
                    penaltyHours = 5;
                    break;
                case '3rd Offense':
                    penaltyHours = 10;
                    break;
                default:
                    penaltyHours = 0;
            }

            // Use the student_id_number as the penalty's student_id
            const studentIdForPenalty = selectedStudent.student_id_number || selectedStudent.student_id || selectedStudent.id;

            const updates = {
                student_id: String(studentIdForPenalty),
                student_name: selectedStudent.name,
                student_email: selectedStudent.email || '',
                violation: violation,
                violation_type: violation,
                category: category,
                hours: penaltyHours,
                status: status,
                offense_level: offenseLevel,
                is_warning: isFirstOffense,
                description: description || violation,
                updated_at: now
            };

            if (!isFirstOffense && (status === 'in-progress' || status === 'Active')) {
                updates.started_at = now;
                updates.hours = penaltyHours;
                await createNotification({
                    title: 'Community Service Started',
                    message: `The ${penaltyHours}-hour community service for ${selectedStudent.name} is now in progress.`,
                    type: 'penalty'
                });
            }

            if (!isFirstOffense && status === 'Completed') {
                updates.completed_at = now;
            }

            if (status === 'Pending' || status === 'Resolved' || isFirstOffense) {
                updates.started_at = null;
            }

            if (!isFirstOffense) {
                if (serviceType) {
                    updates.service_type = serviceType;
                }
                if (deadline) {
                    updates.deadline = deadline;
                }
            } else {
                updates.service_type = null;
                updates.deadline = null;
            }

            const { data: updatedData, error } = await supabaseClient
                .from('penalties')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) {
                showToast('Error', `Failed to update: ${error.message}`, 'error');
                return;
            }

            if (updatedData && updatedData.length > 0) {
                const index = penalties.findIndex(p => p.id === id);
                if (index !== -1) {
                    penalties[index] = updatedData[0];
                }
            }

            const { count } = await supabaseClient
                .from('penalties')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', String(studentIdForPenalty));

            await supabaseClient
                .from('students')
                .update({ violation_count: count || 0 })
                .eq('id', selectedStudent.id);

            let successMessage = 'Penalty updated successfully';
            if (!isFirstOffense && (status === 'in-progress' || status === 'Active') && penaltyHours > 0) {
                successMessage = `Countdown started! ${penaltyHours} hours remaining`;
            }
            showToast('Success', successMessage, 'success');

            modal.close();
            await refreshPenalties();
            await refreshDashboard();

        } catch (err) {
            showToast('Error', err.message || 'An unexpected error occurred', 'error');
        }
    });
};

// DELETE PENALTY
window.deletePenalty = async (id) => {
    const penalty = penalties.find(p => p.id === id);
    if (!penalty) return;

    showDeleteConfirm(
        'Delete Penalty',
        `Are you sure you want to delete "${penalty.violation || penalty.violation_type || 'this penalty'}"?`,
        async () => {
            try {
                const { error } = await supabaseClient
                    .from('penalties')
                    .delete()
                    .eq('id', id);

                if (error) {
                    showToast('Error', 'Failed to delete penalty', 'error');
                    console.error(error);
                } else {
                    showToast('Success', 'Penalty deleted successfully', 'success');
                    refreshPenalties();
                    refreshDashboard();
                }
            } catch (err) {
                showToast('Error', 'An unexpected error occurred', 'error');
                console.error(err);
            }
        }
    );
};

// VIEW STUDENT
window.viewStudent = function (id) {
    console.log('Viewing student ID:', id);
    console.log('Available students:', students);

    const student = students.find(s => s.id === id);
    if (!student) {
        showToast('Error', 'Student not found', 'error');
        return;
    }

    console.log('Found student:', student);

    const violations = penalties.filter(p =>
        p.student_id === student.student_id_number ||
        p.student_name === student.name
    );

    // Create the modal
    const modal = createModal(`Student Profile`, `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Student Avatar and Basic Info -->
            <div style="display: flex; align-items: center; gap: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border, #e2e8f0);">
                <div style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                ">
                    ${(student.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="font-size: 20px; font-weight: 700; color: var(--text, #0f172a); margin: 0;">${student.name || 'Unknown'}</h3>
                    <p style="color: var(--text-2, #475569); margin: 4px 0 0;">${student.course || ''} - ${student.year_level || ''}</p>
                    <p style="color: var(--text-3, #94a3b8); font-size: 13px; margin: 2px 0 0;">ID: ${student.student_id_number || '—'}</p>
                </div>
            </div>

            <!-- Student Details Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Email</label>
                    <p style="font-weight: 500; margin: 4px 0 0; color: var(--text, #0f172a);">${student.email || '—'}</p>
                </div>
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Status</label>
                    <p style="font-weight: 500; margin: 4px 0 0;">
                        <span class="status-badge ${student.status === 'active' ? 'status-completed' : student.status === 'probation' ? 'status-progress' : 'status-rejected'}">
                            ${student.status || 'Active'}
                        </span>
                    </p>
                </div>
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Course</label>
                    <p style="font-weight: 500; margin: 4px 0 0; color: var(--text, #0f172a);">${student.course || '—'}</p>
                </div>
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Year Level</label>
                    <p style="font-weight: 500; margin: 4px 0 0; color: var(--text, #0f172a);">${student.year_level || '—'}</p>
                </div>
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Violation Count</label>
                    <p style="font-weight: 500; margin: 4px 0 0; color: var(--text, #0f172a);">${student.violation_count || 0}</p>
                </div>
                <div style="background: var(--bg, #f8fafc); padding: 12px 16px; border-radius: 8px;">
                    <label style="font-size: 11px; color: var(--text-3, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px;">Student ID</label>
                    <p style="font-weight: 500; margin: 4px 0 0; color: var(--text, #0f172a);">${student.student_id_number || '—'}</p>
                </div>
            </div>

            <!-- Violation History -->
            <div style="border-top: 1px solid var(--border, #e2e8f0); padding-top: 16px;">
                <h4 style="font-size: 16px; font-weight: 600; color: var(--text, #0f172a); margin: 0 0 12px 0;">Violation History</h4>
                ${violations.length === 0 ? `
                    <div style="text-align: center; padding: 20px; color: var(--text-3, #94a3b8);">
                        <p style="margin: 0;">No violations recorded for this student.</p>
                    </div>
                ` : `
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${violations.map(v => `
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 10px 12px;
                                border-bottom: 1px solid var(--border, #e2e8f0);
                                background: var(--bg, #f8fafc);
                                border-radius: 6px;
                                margin-bottom: 6px;
                            ">
                                <div>
                                    <div style="font-weight: 500; color: var(--text, #0f172a);">${v.violation || v.violation_type || 'N/A'}</div>
                                    <div style="font-size: 12px; color: var(--text-3, #94a3b8);">${v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <span class="status-badge ${v.status === 'Completed' || v.status === 'Resolved' ? 'status-completed' : v.status === 'in-progress' || v.status === 'Active' ? 'status-progress' : 'status-pending'}">
                                    ${v.status || 'Active'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `, `
        <button class="action-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="action-btn primary" onclick="editStudent('${student.id}'); document.querySelector('.modal-overlay').remove();">
            <svg class="icon-svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; stroke: white; fill: none;">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Edit Student
        </button>
    `);
};

// EDIT STUDENT
window.editStudent = async function (id) {
    console.log('Editing student:', id);

    const student = students.find(s => s.id === id);
    if (!student) {
        showToast('Error', 'Student not found', 'error');
        return;
    }

    const modal = createModal('Edit Student', `
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Full Name *</label>
            <input id="editStudentName" value="${student.name || ''}" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Student ID *</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input id="editStudentId" value="${student.student_id_number || ''}" style="flex: 1; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
                <button type="button" class="btn-generate-id" id="editGenerateIdBtn" style="
                    padding: 8px 14px;
                    background: var(--blue-light, #eff6ff);
                    color: var(--blue, #2563eb);
                    border: 1px solid var(--border, #e2e8f0);
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: var(--transition);
                    font-family: inherit;
                ">
                    <svg class="icon-svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Generate
                </button>
            </div>
            <small style="color: var(--text-3, #94a3b8); font-size: 11px; display: block; margin-top: 4px;">
                Format: Year (2 digits) + 6-digit sequential number (e.g., 26012345)
            </small>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Email *</label>
            <input id="editStudentEmail" type="email" value="${student.email || ''}" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);" />
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Course *</label>
                <select id="editStudentCourse" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                    <option value="BSIT" ${student.course === 'BSIT' ? 'selected' : ''}>BSIT</option>
                    <option value="BSCS" ${student.course === 'BSCS' ? 'selected' : ''}>BSCS</option>
                    <option value="BSBA" ${student.course === 'BSBA' ? 'selected' : ''}>BSBA</option>
                    <option value="BSED" ${student.course === 'BSED' ? 'selected' : ''}>BSED</option>
                    <option value="BSN" ${student.course === 'BSN' ? 'selected' : ''}>BSN</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Year Level *</label>
                <select id="editStudentYear" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                    <option value="1st" ${student.year_level === '1st' ? 'selected' : ''}>1st Year</option>
                    <option value="2nd" ${student.year_level === '2nd' ? 'selected' : ''}>2nd Year</option>
                    <option value="3rd" ${student.year_level === '3rd' ? 'selected' : ''}>3rd Year</option>
                    <option value="4th" ${student.year_level === '4th' ? 'selected' : ''}>4th Year</option>
                </select>
            </div>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text, #0f172a);">Status</label>
            <select id="editStudentStatus" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 14px; background: var(--surface, #ffffff); color: var(--text, #0f172a);">
                <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="probation" ${student.status === 'probation' ? 'selected' : ''}>Probation</option>
                <option value="warning" ${student.status === 'warning' ? 'selected' : ''}>Warning</option>
                <option value="suspended" ${student.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
        </div>
    `, `
        <button class="action-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="action-btn primary" id="saveStudentBtn">Save Changes</button>
    `);

    // Generate ID button
    const generateBtn = modal.getElement().querySelector('#editGenerateIdBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const newId = generateStudentId();
            document.getElementById('editStudentId').value = newId;
            showToast('New ID generated', `Student ID: ${newId}`, 'info');
        });
    }

    // Save button
    const saveBtn = modal.getElement().querySelector('#saveStudentBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const name = document.getElementById('editStudentName').value.trim();
            const studentId = document.getElementById('editStudentId').value.trim();
            const email = document.getElementById('editStudentEmail').value.trim();
            const course = document.getElementById('editStudentCourse').value;
            const year = document.getElementById('editStudentYear').value;
            const status = document.getElementById('editStudentStatus').value;

            if (!name) {
                showToast('Error', 'Full name is required', 'error');
                return;
            }
            if (!studentId) {
                showToast('Error', 'Student ID is required', 'error');
                return;
            }
            if (!/^\d{8}$/.test(studentId)) {
                showToast('Error', 'Student ID must be 8 digits (e.g., 26012345)', 'error');
                return;
            }
            if (!email) {
                showToast('Error', 'Email is required', 'error');
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                showToast('Error', 'Please enter a valid email address', 'error');
                return;
            }

            const existingStudent = students.find(s => s.student_id_number === studentId && s.id !== id);
            if (existingStudent) {
                showToast('Error', `Student ID ${studentId} already exists`, 'error');
                return;
            }

            const updates = {
                name: name,
                student_id_number: studentId,
                email: email,
                course: course,
                year_level: year,
                status: status,
                updated_at: new Date().toISOString()
            };

            try {
                const { error } = await supabaseClient
                    .from('students')
                    .update(updates)
                    .eq('id', id);

                if (error) {
                    showToast('Error', 'Failed to update student', 'error');
                    console.error(error);
                } else {
                    showToast('Success', 'Student updated successfully', 'success');
                    modal.close();
                    refreshStudents();
                    refreshDashboard();
                }
            } catch (err) {
                showToast('Error', 'An unexpected error occurred', 'error');
                console.error(err);
            }
        });
    }
};

// DELETE STUDENT
window.deleteStudent = async (id) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    showDeleteConfirm(
        'Delete Student',
        `Are you sure you want to delete "${student.name || 'this student'}"? This will also remove all their penalty records.`,
        async () => {
            try {
                const { error: penaltyError } = await supabaseClient
                    .from('penalties')
                    .delete()
                    .eq('student_id', String(student.id));

                if (penaltyError) {
                    console.error('Error deleting student penalties:', penaltyError);
                }

                const { error } = await supabaseClient
                    .from('students')
                    .delete()
                    .eq('id', id);

                if (error) {
                    showToast('Error', 'Failed to delete student', 'error');
                    console.error(error);
                } else {
                    showToast('Success', 'Student deleted successfully', 'success');
                    refreshStudents();
                    refreshDashboard();
                }
            } catch (err) {
                showToast('Error', 'An unexpected error occurred', 'error');
                console.error(err);
            }
        }
    );
};

// VIEW APPEAL
window.viewAppeal = async (id) => {
    const appeal = appeals.find(a => a.id === id);
    if (!appeal) {
        showToast('Error', 'Appeal not found', 'error');
        return;
    }

    const detailEl = document.getElementById('appealDetail');
    if (!detailEl) return;

    detailEl.style.display = 'block';

    document.getElementById('appealDetailId').textContent = `#${appeal.id}`;
    document.getElementById('appealDetailStudent').textContent = appeal.student_name || 'Unknown';

    const violation = appeal.penalty_violation || appeal.violation || appeal.violation_type || '—';
    document.getElementById('appealDetailViolation').textContent = violation;

    document.getElementById('appealDetailDate').textContent = appeal.created_at ? new Date(appeal.created_at).toLocaleDateString() : 'N/A';

    document.getElementById('appealDetailStatus').textContent = appeal.status || 'Pending';
    const reason = appeal.appeal_reason || appeal.reason || 'No reason provided';
    document.getElementById('appealDetailReason').textContent = reason;

    detailEl.dataset.appealId = id;
};

// APPROVE APPEAL
window.approveAppeal = async (id) => {
    if (!confirm('Approve this appeal?')) return;

    const reviewedBy = currentAdmin?.full_name || currentAdmin?.name || 'Admin';
    const now = new Date().toISOString();

    let { data, error } = await supabaseClient
        .from('appeals')
        .update({
            status: 'Approved',
            reviewed_by: reviewedBy,
            reviewed_at: now,
            updated_at: now
        })
        .eq('id', id)
        .select();

    if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn('Retrying appeal update with status-only (schema mismatch):', error.message);
        const retry = await supabaseClient
            .from('appeals')
            .update({ status: 'Approved' })
            .eq('id', id)
            .select();
        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error('Approve error:', error);
        showToast('Error', `Failed to approve appeal: ${error.message}`, 'error');
        return;
    }

    if (data && data.length > 0) {
        const appeal = data[0];
        await createNotification({
            student_id: appeal.student_id || null,
            title: 'Appeal Approved',
            message: `Your appeal for "${appeal.violation || appeal.penalty_violation || 'violation'}" has been approved by ${reviewedBy}.`,
            type: 'appeal'
        });

        showToast('Success', 'Appeal approved', 'success');
        await refreshAppeals();
        await refreshDashboard();
        await loadNotifications();
        const detailEl = document.getElementById('appealDetail');
        if (detailEl) detailEl.style.display = 'none';
    }
};

// REJECT APPEAL 
window.rejectAppeal = async (id) => {
    if (!confirm('Reject this appeal?')) return;

    const reviewedBy = currentAdmin?.full_name || currentAdmin?.name || 'Admin';
    const now = new Date().toISOString();

    let { data, error } = await supabaseClient
        .from('appeals')
        .update({
            status: 'Rejected',
            reviewed_by: reviewedBy,
            reviewed_at: now,
            updated_at: now
        })
        .eq('id', id)
        .select();

    if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn('Retrying appeal update with status-only (schema mismatch):', error.message);
        const retry = await supabaseClient
            .from('appeals')
            .update({ status: 'Rejected' })
            .eq('id', id)
            .select();
        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error('Reject error:', error);
        showToast('Error', `Failed to reject appeal: ${error.message}`, 'error');
        return;
    }

    if (data && data.length > 0) {
        const appeal = data[0];
        await createNotification({
            student_id: appeal.student_id || null,
            title: 'Appeal Rejected',
            message: `Your appeal for "${appeal.violation || appeal.penalty_violation || 'violation'}" has been rejected by ${reviewedBy}.`,
            type: 'appeal'
        });

        showToast('Success', 'Appeal rejected', 'success');
        await refreshAppeals();
        await refreshDashboard();
        await loadNotifications();
        const detailEl = document.getElementById('appealDetail');
        if (detailEl) detailEl.style.display = 'none';
    }
};

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

// CLOSE PROFILE AND APPEAL DETAIL
document.getElementById('closeProfileBtn')?.addEventListener('click', () => {
    document.getElementById('studentProfile').style.display = 'none';
});

document.getElementById('closeAppealBtn')?.addEventListener('click', () => {
    document.getElementById('appealDetail').style.display = 'none';
});

document.getElementById('approveAppealBtn')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('appealDetail').dataset.appealId);
    if (id) approveAppeal(id);
});

document.getElementById('rejectAppealBtn')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('appealDetail').dataset.appealId);
    if (id) rejectAppeal(id);
});

// ADD PENALTY
document.getElementById('addPenaltyBtn')?.addEventListener('click', async function () {
    console.log('Add Penalty button clicked');

    // Force reload students from database
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading students:', error);
            showToast('Error', 'Failed to load students', 'error');
            return;
        }

        if (!data || data.length === 0) {
            showToast('Error', 'No students found. Please add a student first.', 'error');
            return;
        }

        students = data;
        console.log('Students loaded:', students.length);
    } catch (e) {
        console.error('Error:', e);
        showToast('Error', 'Failed to load students', 'error');
        return;
    }

    // Build student options - use student_id_number as the value
    let studentOptions = '';
    for (let i = 0; i < students.length; i++) {
        let s = students[i];
        let studentIdValue = s.student_id_number || s.student_id || s.id;
        let displayName = s.name || 'Unknown';
        let displayId = s.student_id_number || s.student_id || 'N/A';
        // Use student_id_number as the value, not the database id
        studentOptions += `<option value="${studentIdValue}">${displayName} (${displayId})</option>`;
    }

    let modal = createModal('Add New Penalty', `
        <div class="form-group">
            <label>Violation Type *</label>
            <select id="newPenaltyName">
                <option value="">-- Select a violation --</option>
                <option value="Academic Dishonesty">Academic Dishonesty</option>
                <option value="Cheating">Cheating</option>
                <option value="Plagiarism">Plagiarism</option>
                <option value="Class Disruption">Class Disruption</option>
                <option value="Insubordination">Insubordination</option>
                <option value="Bullying">Bullying</option>
                <option value="Fighting">Fighting</option>
                <option value="Vandalism">Vandalism</option>
                <option value="Theft">Theft</option>
                <option value="Tardiness">Tardiness</option>
                <option value="Absenteeism">Absenteeism</option>
                <option value="Uniform Violation">Uniform Violation</option>
                <option value="Cell Phone Use">Cell Phone Use</option>
                <option value="Smoking">Smoking</option>
                <option value="Alcohol/Drugs">Alcohol/Drugs</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="newPenaltyDesc" placeholder="Detailed description"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Offense Level *</label>
                <select id="newPenaltyLevel">
                    <option value="1st Offense">1st Offense</option>
                    <option value="2nd Offense">2nd Offense</option>
                    <option value="3rd Offense">3rd Offense</option>
                </select>
            </div>
            <div class="form-group">
                <label>Community Service Hours</label>
                <div id="newPenaltyHoursDisplay" style="padding: 10px 14px; background: #f1f5f9; border-radius: 8px; border: 1px solid var(--border); color: var(--text); font-weight: 600;">
                    0 hours
                </div>
                <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                    Hours are automatically set based on offense level
                </small>
            </div>
        </div>
        <div class="form-group" style="background: #f0f4ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2563EB;">
            <label style="font-weight: 600; color: #1e293b;">Suggested Penalty:</label>
            <div id="suggestedPenaltyDisplay" style="color: #475569; margin-top: 4px; font-size: 14px;">
                Warning Only
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Service Type</label>
                <select id="newPenaltyServiceType">
                    <option value="Community Service">Community Service</option>
                    <option value="Campus Cleanup">Campus Cleanup</option>
                    <option value="Office Assistance">Office Assistance</option>
                    <option value="Tutoring">Tutoring</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Deadline (Date to Report)</label>
                <input id="newPenaltyDeadline" type="date" />
                <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                    The date the student must report to the office to start community service
                </small>
            </div>
        </div>
        <div class="form-group">
            <label>Status *</label>
            <select id="newPenaltyStatus">
                <option value="Pending" selected>Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="Completed">Completed</option>
            </select>
            <small style="color: var(--text-3); font-size: 11px; display: block; margin-top: 4px;">
                Select the current status of this penalty
            </small>
        </div>
        <div class="form-group">
            <label>Select Student *</label>
            <select id="newPenaltyStudent">
                <option value="">-- Select a student --</option>
                ${studentOptions}
            </select>
        </div>
    `, `
        <button class="action-btn" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">Cancel</button>
        <button class="action-btn primary" id="createPenaltyBtn">Add Penalty</button>
    `);

    let levelSelect = modal.getElement().querySelector('#newPenaltyLevel');
    let hoursDisplay = modal.getElement().querySelector('#newPenaltyHoursDisplay');
    let serviceTypeSelect = modal.getElement().querySelector('#newPenaltyServiceType');
    let deadlineInput = modal.getElement().querySelector('#newPenaltyDeadline');
    let statusSelect = modal.getElement().querySelector('#newPenaltyStatus');
    let suggestionDisplay = modal.getElement().querySelector('#suggestedPenaltyDisplay');

    let defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    deadlineInput.value = defaultDeadline.toISOString().split('T')[0];
    statusSelect.value = 'Pending';

    function updateSuggestion() {
        let level = levelSelect.value;
        let suggestion = '';
        let hours = 0;
        let isFirstOffense = false;

        switch (level) {
            case '1st Offense':
                suggestion = 'Warning Only - No community service required';
                hours = 0;
                isFirstOffense = true;
                break;
            case '2nd Offense':
                suggestion = '5 hours Community Service + Formal Notice';
                hours = 5;
                isFirstOffense = false;
                break;
            case '3rd Offense':
                suggestion = '10 hours Community Service + Meeting with SAO';
                hours = 10;
                isFirstOffense = false;
                break;
            default:
                suggestion = 'Warning Only';
                hours = 0;
                isFirstOffense = true;
        }

        suggestionDisplay.textContent = suggestion;
        hoursDisplay.textContent = hours + ' hours';

        if (isFirstOffense) {
            serviceTypeSelect.disabled = true;
            serviceTypeSelect.style.cursor = 'not-allowed';
            serviceTypeSelect.style.opacity = '0.6';
            serviceTypeSelect.style.backgroundColor = '#f1f5f9';
            serviceTypeSelect.value = 'Community Service';
            deadlineInput.disabled = true;
            deadlineInput.style.cursor = 'not-allowed';
            deadlineInput.style.opacity = '0.6';
            deadlineInput.style.backgroundColor = '#f1f5f9';
            deadlineInput.value = '';
            statusSelect.value = 'Resolved';
            statusSelect.disabled = true;
            statusSelect.style.cursor = 'not-allowed';
            statusSelect.style.opacity = '0.6';
            statusSelect.style.backgroundColor = '#f1f5f9';
        } else {
            serviceTypeSelect.disabled = false;
            serviceTypeSelect.style.cursor = 'pointer';
            serviceTypeSelect.style.opacity = '1';
            serviceTypeSelect.style.backgroundColor = '';
            deadlineInput.disabled = false;
            deadlineInput.style.cursor = 'pointer';
            deadlineInput.style.opacity = '1';
            deadlineInput.style.backgroundColor = '';
            statusSelect.disabled = false;
            statusSelect.style.cursor = 'pointer';
            statusSelect.style.opacity = '1';
            statusSelect.style.backgroundColor = '';
            if (statusSelect.value !== 'Pending' && statusSelect.value !== 'in-progress' && statusSelect.value !== 'Completed') {
                statusSelect.value = 'Pending';
            }
        }
    }

    levelSelect.addEventListener('change', updateSuggestion);
    updateSuggestion();

    modal.getElement().querySelector('#createPenaltyBtn').addEventListener('click', async function () {
        let violation = document.getElementById('newPenaltyName').value;
        let studentIdValue = document.getElementById('newPenaltyStudent').value;
        let deadline = document.getElementById('newPenaltyDeadline').value;
        let serviceType = document.getElementById('newPenaltyServiceType').value;
        let offenseLevel = document.getElementById('newPenaltyLevel').value;
        let status = document.getElementById('newPenaltyStatus').value;
        let description = document.getElementById('newPenaltyDesc').value.trim();

        if (!violation) {
            showToast('Error', 'Please select a violation type', 'error');
            return;
        }

        if (!studentIdValue) {
            showToast('Error', 'Please select a student', 'error');
            return;
        }

        // Find the selected student by matching student_id_number or student_id
        let selectedStudent = null;
        for (let i = 0; i < students.length; i++) {
            let s = students[i];
            let sId = s.student_id_number || s.student_id || s.id;
            if (String(sId) === String(studentIdValue)) {
                selectedStudent = s;
                break;
            }
        }

        if (!selectedStudent) {
            showToast('Error', 'Selected student not found. Please try again.', 'error');
            return;
        }

        let category = 'Other';
        let academicViolations = ['Academic Dishonesty', 'Cheating', 'Plagiarism'];
        let behaviorViolations = ['Class Disruption', 'Insubordination', 'Bullying', 'Fighting'];
        let attendanceViolations = ['Tardiness', 'Absenteeism'];
        let uniformViolations = ['Uniform Violation'];

        if (academicViolations.includes(violation)) category = 'Academic';
        else if (behaviorViolations.includes(violation)) category = 'Behavior';
        else if (attendanceViolations.includes(violation)) category = 'Attendance';
        else if (uniformViolations.includes(violation)) category = 'Uniform';

        let isFirstOffense = offenseLevel === '1st Offense';

        let penaltyHours = 0;
        let penaltyDescription = '';
        switch (offenseLevel) {
            case '1st Offense':
                penaltyHours = 0;
                penaltyDescription = 'Warning Only';
                break;
            case '2nd Offense':
                penaltyHours = 5;
                penaltyDescription = '5 hours Community Service + Formal Notice';
                break;
            case '3rd Offense':
                penaltyHours = 10;
                penaltyDescription = '10 hours Community Service + Meeting with SAO';
                break;
            default:
                penaltyHours = 0;
                penaltyDescription = 'Warning Only';
        }

        let finalStatus = status || 'Pending';
        if (isFirstOffense) {
            finalStatus = 'Resolved';
        }

        let now = new Date().toISOString();

        // Use the student_id_number or student_id as the student_id in penalties
        let studentIdForPenalty = selectedStudent.student_id_number || selectedStudent.student_id || selectedStudent.id;
        studentIdForPenalty = String(studentIdForPenalty);

        let penaltyData = {
            student_id: studentIdForPenalty,
            student_name: selectedStudent.name,
            student_email: selectedStudent.email || '',
            violation: violation,
            violation_type: violation,
            category: category,
            hours: penaltyHours,
            status: finalStatus,
            offense_level: offenseLevel,
            is_warning: isFirstOffense,
            description: description || violation,
            created_at: now,
            updated_at: now
        };

        if (!isFirstOffense && (finalStatus === 'in-progress' || finalStatus === 'Active')) {
            penaltyData.started_at = now;
        } else if (!isFirstOffense && finalStatus === 'Completed') {
            penaltyData.completed_at = now;
        } else if (!isFirstOffense && finalStatus === 'Pending') {
            penaltyData.started_at = null;
        } else {
            penaltyData.completed_at = now;
        }

        if (!isFirstOffense) {
            if (serviceType) {
                penaltyData.service_type = serviceType;
            }
            if (deadline) {
                penaltyData.deadline = deadline;
            }
        }

        try {
            let result = await supabaseClient
                .from('penalties')
                .insert([penaltyData])
                .select();

            if (result.error) {
                console.error('Supabase error:', result.error);
                showToast('Error', result.error.message, 'error');
                return;
            }

            if (result.data) {
                await createNotification({
                    student_id: studentIdForPenalty,
                    title: 'New Penalty Recorded',
                    message: offenseLevel + ': ' + penaltyDescription + ' for ' + selectedStudent.name,
                    type: 'penalty'
                });

                let successMessage = offenseLevel + ': ' + penaltyDescription + ' for ' + selectedStudent.name;
                if (finalStatus === 'in-progress' && penaltyHours > 0) {
                    successMessage += ' Countdown started! (' + penaltyHours + ' hours)';
                }
                showToast('Success', successMessage, 'success');

                modal.close();
                refreshPenalties();
                refreshDashboard();

                let countResult = await supabaseClient
                    .from('penalties')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', studentIdForPenalty);

                await supabaseClient
                    .from('students')
                    .update({ violation_count: countResult.count || 0 })
                    .eq('id', selectedStudent.id);
            }
        } catch (err) {
            console.error('Error:', err);
            showToast('Error', 'An unexpected error occurred', 'error');
        }
    });
});

// FIXED: ADD STUDENT BUTTONS EVENT LISTENERS
document.getElementById('addStudentBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    console.log('Add Student button 1 clicked');
    openAddStudentModal();
});

document.getElementById('addStudentBtn2')?.addEventListener('click', function (e) {
    e.preventDefault();
    console.log('Add Student button 2 clicked');
    openAddStudentModal();
});

// IMPORT STUDENTS
document.getElementById('importStudentsBtn')?.addEventListener('click', () => {
    document.getElementById('importStudentsFile')?.click();
});

document.getElementById('importStudentsFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            showToast('Error', 'CSV file is empty or invalid', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const idIdx = headers.findIndex(h => h.includes('id') || h.includes('student'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const courseIdx = headers.findIndex(h => h.includes('course'));
        const yearIdx = headers.findIndex(h => h.includes('year'));

        if (nameIdx === -1 || idIdx === -1) {
            showToast('Error', 'CSV must contain Name and Student ID columns', 'error');
            return;
        }

        const studentsToInsert = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if (cols.length <= Math.max(nameIdx, idIdx, emailIdx)) continue;

            const name = cols[nameIdx] || '';
            const studentId = cols[idIdx] || '';
            if (!name || !studentId) continue;

            studentsToInsert.push({
                name,
                student_id: studentId,
                email: emailIdx !== -1 ? cols[emailIdx] || '' : '',
                course: courseIdx !== -1 ? cols[courseIdx] || 'BSIT' : 'BSIT',
                year: yearIdx !== -1 ? cols[yearIdx] || '1st' : '1st',
                status: 'Good',
                violation_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        if (studentsToInsert.length === 0) {
            showToast('Error', 'No valid student records found', 'error');
            return;
        }

        const { error } = await supabaseClient
            .from('students')
            .insert(studentsToInsert);

        if (error) {
            showToast('Error', 'Failed to import students', 'error');
            console.error(error);
        } else {
            showToast('Success', `${studentsToInsert.length} students imported successfully`, 'success');
            e.target.value = '';
            refreshStudents();
            refreshDashboard();
        }
    } catch (error) {
        showToast('Error', 'Failed to read CSV file', 'error');
        console.error(error);
    }
});

// QUICK ACTION BUTTONS
document.getElementById('addViolationBtn')?.addEventListener('click', () => {
    document.getElementById('addPenaltyBtn')?.click();
});

document.getElementById('reviewAppealsBtn')?.addEventListener('click', () => {
    navigate('appeals');
});

document.getElementById('generateReportBtn')?.addEventListener('click', () => {
    navigate('reports');
});

document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const data = [
        ...students.map(s => ({ ...s, type: 'Student' })),
        ...penalties.map(p => ({ ...p, type: 'Penalty' })),
        ...appeals.map(a => ({ ...a, type: 'Appeal' }))
    ];
    exportToCSV(data, `saocst_export_${new Date().toISOString().slice(0, 10)}.csv`);
});

// EXPORT BUTTONS
document.getElementById('exportPenaltiesBtn')?.addEventListener('click', () => {
    exportToCSV(penalties, `penalties_${new Date().toISOString().slice(0, 10)}.csv`);
});

document.getElementById('exportPdf')?.addEventListener('click', () => {
    showToast('Info', 'PDF export will be available soon', 'info');
});

document.getElementById('exportExcel')?.addEventListener('click', () => {
    const data = [
        ...students.map(s => ({ Name: s.name, ID: s.student_id, Course: s.course, Status: s.status })),
        ...penalties.map(p => ({ Violation: p.violation_type, Level: p.level, Status: p.status }))
    ];
    exportToCSV(data, `report_${new Date().toISOString().slice(0, 10)}.csv`);
});

document.getElementById('exportCsv')?.addEventListener('click', () => {
    const data = [
        ...students.map(s => ({ Name: s.name, ID: s.student_id, Course: s.course, Status: s.status })),
        ...penalties.map(p => ({ Violation: p.violation_type, Level: p.level, Status: p.status })),
        ...appeals.map(a => ({ Student: a.student_name, Status: a.status, Reason: a.reason }))
    ];
    exportToCSV(data, `full_report_${new Date().toISOString().slice(0, 10)}.csv`);
});

document.getElementById('printReport')?.addEventListener('click', () => {
    window.print();
});

document.getElementById('scheduleReport')?.addEventListener('click', () => {
    showToast('Info', 'Schedule report feature coming soon', 'info');
});

// SETTINGS BUTTONS
document.getElementById('editSchoolInfoBtn')?.addEventListener('click', () => {
    showToast('Info', 'School info editing coming soon', 'info');
});

document.getElementById('addAdminBtn')?.addEventListener('click', () => {
    showToast('Info', 'Add admin feature coming soon', 'info');
});

document.getElementById('backupNowBtn')?.addEventListener('click', () => {
    showToast('Info', 'Backup initiated...', 'info');
    setTimeout(() => {
        showToast('Success', 'Backup completed successfully', 'success');
        document.getElementById('lastBackup').textContent = new Date().toLocaleString();
    }, 2000);
});

document.getElementById('configureNotifBtn')?.addEventListener('click', () => {
    showToast('Info', 'Notification settings coming soon', 'info');
});

document.getElementById('viewAuditLogsBtn')?.addEventListener('click', () => {
    showToast('Info', 'Audit logs feature coming soon', 'info');
});

// TREND PERIOD CHANGE
document.getElementById('trendPeriod')?.addEventListener('change', () => {
    updateCharts();
});

// SEARCH AND FILTER DEBOUNCING
['penaltySearch', 'studentSearch', 'appealSearch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            clearTimeout(el._timeout);
            el._timeout = setTimeout(() => {
                if (id === 'penaltySearch') refreshPenalties();
                else if (id === 'studentSearch') refreshStudents();
                else if (id === 'appealSearch') refreshAppeals();
            }, 300);
        });
    }
});

['penaltyCategoryFilter', 'penaltyStatusFilter', 'studentCourseFilter', 'studentStatusFilter',
    'appealStatusFilter', 'appealDateFilter'
].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', () => {
            if (id.includes('penalty')) refreshPenalties();
            else if (id.includes('student')) refreshStudents();
            else if (id.includes('appeal')) refreshAppeals();
        });
    }
});

// REVIEW ALL APPEALS
document.getElementById('reviewAllBtn')?.addEventListener('click', () => {
    const pending = appeals.filter(a => (a.status || '').toLowerCase() === 'pending');
    if (pending.length === 0) {
        showToast('Info', 'No pending appeals to review', 'info');
        return;
    }
    if (pending.length > 0) {
        viewAppeal(pending[0].id);
    }
});

// REQUEST MORE INFO
document.getElementById('requestInfoBtn')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('appealDetail').dataset.appealId);
    const appeal = appeals.find(a => a.id === id);
    if (appeal) {
        showToast('Info', `Request sent to ${appeal.student_name || 'student'} for more information`, 'info');
    }
});

// STATUS DOT CLICK
document.getElementById('statusDot')?.addEventListener('click', function () {
    const statuses = ['online', 'away', 'offline'];
    const current = this.className.split(' ').find(c => statuses.includes(c)) || 'online';
    const idx = statuses.indexOf(current);
    const next = statuses[(idx + 1) % statuses.length];
    this.className = `status-dot ${next}`;
    document.getElementById('statusText').textContent = next.charAt(0).toUpperCase() + next.slice(1);
    showToast('Status Updated', `You are now ${next}`, 'info');
});

// TAB/BROWSER CLOSE HANDLER
function handleTabOrBrowserClose() {
    window.addEventListener('beforeunload', function (e) {
        clearTimeout(logoutTimer);
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('adminSessionExpiry');
        localStorage.removeItem('rememberedAdmin');
        localStorage.removeItem('adminSession');
        sessionStorage.clear();
        if (typeof supabase !== 'undefined' && supabase) {
            try { supabase.auth.signOut(); } catch (e) { }
        }
    });
}

// INITIALIZATION
setupDrawer();
handleTabOrBrowserClose();

const session = localStorage.getItem('currentAdmin');
if (session) {
    Promise.all([
        fetchAdminName(),
        loadNotifications()
    ]).then(() => {
        navigate('dashboard');
    }).catch(err => {
        showToast('Error', 'Failed to initialize dashboard', 'error');
    });
} else {
    window.location.href = '/Assets/Student_Authentication/Admin_Authentication/AdminLogin.html';
}

setInterval(() => {
    const activePage = document.querySelector('.drawer-item.active')?.dataset?.page || 'dashboard';
    if (activePage === 'dashboard') refreshDashboard();
    loadNotifications();
}, 30000);