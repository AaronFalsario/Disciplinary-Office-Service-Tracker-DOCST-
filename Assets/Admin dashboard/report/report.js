import { initAdminDrawer, setupAdminLogout } from '/Assets/drawer-admin.js';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize drawer and setup logout
initAdminDrawer();
setupAdminLogout('logoutBtn');

let penaltiesData = [];
let studentsData = [];
let adminsData = [];
let trendChart = null;
let categoryChart = null;
let statusChart = null;

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
let currentAdmin = null;

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

// ============ LOAD ALL DATA FROM SUPABASE ============
async function loadData() {
    try {
        showInfoToast('Loading reports data...', 'Please Wait', 1500);
        
        const [penaltiesRes, studentsRes, adminsRes] = await Promise.all([
            supabase.from('penalties').select('*').order('created_at', { ascending: false }),
            supabase.from('students').select('*'),
            supabase.from('admins').select('*')
        ]);
        
        if (penaltiesRes.error) throw penaltiesRes.error;
        if (studentsRes.error) throw studentsRes.error;
        if (adminsRes.error) throw adminsRes.error;
        
        penaltiesData = penaltiesRes.data || [];
        studentsData = studentsRes.data || [];
        adminsData = adminsRes.data || [];
        
        console.log(`Loaded: ${penaltiesData.length} penalties, ${studentsData.length} students, ${adminsData.length} admins`);
        
        updateAnalytics();
        updateCharts();
        updateRecentPenaltiesTable();
        updateTopStudentsTable();
        updateMonthlySummaryTable();
        
        showSuccessToast(`Loaded ${penaltiesData.length} penalty records`, 'Data Loaded', 2000);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorToast('Failed to load data: ' + error.message, 'Error');
    }
}

// ============ UPDATE ANALYTICS CARDS ============
function updateAnalytics() {
    const year = document.getElementById('yearFilter')?.value || '2026';
    const month = document.getElementById('monthFilter')?.value;
    
    let filteredPenalties = penaltiesData;
    
    if (year) {
        filteredPenalties = filteredPenalties.filter(p => {
            const date = new Date(p.created_at);
            return date.getFullYear().toString() === year;
        });
    }
    
    if (month && month !== 'all') {
        filteredPenalties = filteredPenalties.filter(p => {
            const date = new Date(p.created_at);
            return (date.getMonth() + 1).toString() === month;
        });
    }
    
    const totalPenalties = filteredPenalties.length;
    const completedPenalties = filteredPenalties.filter(p => p.status === 'completed').length;
    const completionRate = totalPenalties > 0 ? Math.round((completedPenalties / totalPenalties) * 100) : 0;
    const totalHours = filteredPenalties.reduce((sum, p) => sum + (p.hours || 0), 0);
    const activeStudents = studentsData.length;
    const totalAdmins = adminsData.length;
    const pendingPenalties = filteredPenalties.filter(p => p.status === 'pending').length;
    const inProgressPenalties = filteredPenalties.filter(p => p.status === 'in-progress').length;
    
    document.getElementById('totalPenalties').textContent = totalPenalties;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('activeStudents').textContent = activeStudents;
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('pendingPenalties').textContent = pendingPenalties;
    document.getElementById('inProgressPenalties').textContent = inProgressPenalties;
}

// ============ UPDATE CHARTS ============
function updateCharts() {
    updateTrendChart();
    updateCategoryChart();
    updateStatusChart();
}

function updateTrendChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyCounts = new Array(12).fill(0);
    
    penaltiesData.forEach(penalty => {
        if (penalty.created_at) {
            const date = new Date(penalty.created_at);
            if (date.getFullYear() === currentYear) {
                monthlyCounts[date.getMonth()]++;
            }
        }
    });
    
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;
    
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Penalties',
                data: monthlyCounts,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563EB',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1E293B', titleColor: '#fff', bodyColor: '#94A3B8' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
            }
        }
    });
}

function updateCategoryChart() {
    const violationCount = {};
    penaltiesData.forEach(penalty => {
        if (penalty.violation) {
            violationCount[penalty.violation] = (violationCount[penalty.violation] || 0) + 1;
        }
    });
    
    const sorted = Object.entries(violationCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(v => v[0]);
    const data = sorted.map(v => v[1]);
    
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    
    if (categoryChart) categoryChart.destroy();
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#64748B' } },
                tooltip: { backgroundColor: '#1E293B' }
            }
        }
    });
}

function updateStatusChart() {
    const statusCount = {
        pending: 0,
        'in-progress': 0,
        completed: 0
    };
    
    penaltiesData.forEach(penalty => {
        const status = penalty.status || 'pending';
        if (status === 'pending') statusCount.pending++;
        else if (status === 'in-progress') statusCount['in-progress']++;
        else if (status === 'completed') statusCount.completed++;
    });
    
    const ctx = document.getElementById('statusChart')?.getContext('2d');
    if (!ctx) return;
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In Progress', 'Completed'],
            datasets: [{
                label: 'Number of Penalties',
                data: [statusCount.pending, statusCount['in-progress'], statusCount.completed],
                backgroundColor: ['#F59E0B', '#2563EB', '#10B981'],
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1E293B' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
            }
        }
    });
}

// ============ RECENT PENALTIES TABLE ============
function updateRecentPenaltiesTable() {
    const tbody = document.getElementById('recentPenaltiesTable');
    if (!tbody) return;
    
    const recentPenalties = [...penaltiesData].slice(0, 10);
    
    if (recentPenalties.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No penalties found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = recentPenalties.map(penalty => `
        <tr>
            <td>${escapeHtml(penalty.student_id || 'N/A')}</td>
            <td>${escapeHtml(penalty.violation || 'N/A')}</td>
            <td>${penalty.hours || 0} hrs</td>
            <td><span class="status-badge status-${penalty.status === 'in-progress' ? 'progress' : penalty.status}">${penalty.status || 'pending'}</span></td>
            <td>${penalty.deadline ? new Date(penalty.deadline).toLocaleDateString() : 'N/A'}</td>
            <td>${penalty.created_at ? new Date(penalty.created_at).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// ============ TOP STUDENTS TABLE ============
function updateTopStudentsTable() {
    const tbody = document.getElementById('topStudentsTable');
    if (!tbody) return;
    
    const studentPenaltyCount = {};
    penaltiesData.forEach(penalty => {
        const studentId = penalty.student_id;
        if (studentId) {
            studentPenaltyCount[studentId] = (studentPenaltyCount[studentId] || 0) + 1;
        }
    });
    
    const sortedStudents = Object.entries(studentPenaltyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (sortedStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No student data available</td></tr>`;
        return;
    }
    
    tbody.innerHTML = sortedStudents.map(([studentId, count], index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(studentId)}</td>
            <td>${count}</td>
        </tr>
    `).join('');
}

// ============ MONTHLY SUMMARY TABLE ============
function updateMonthlySummaryTable() {
    const tbody = document.getElementById('monthlySummaryTable');
    if (!tbody) return;
    
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    penaltiesData.forEach(penalty => {
        if (penalty.created_at) {
            const date = new Date(penalty.created_at);
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { total: 0, completed: 0, hours: 0 };
            }
            
            monthlyData[monthYear].total++;
            if (penalty.status === 'completed') monthlyData[monthYear].completed++;
            monthlyData[monthYear].hours += penalty.hours || 0;
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB - dateA;
    }).slice(0, 12);
    
    if (sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No monthly data available</td></tr>`;
        return;
    }
    
    tbody.innerHTML = sortedMonths.map(month => {
        const data = monthlyData[month];
        const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        return `
            <tr>
                <td>${month}</td>
                <td>${data.total}</td>
                <td>${completionRate}%</td>
                <td>${data.hours} hrs</td>
            </tr>
        `;
    }).join('');
}

// ============ EXPORT FUNCTIONS ============
function exportToCSV() {
    const headers = ['Student ID', 'Violation', 'Service Type', 'Hours', 'Status', 'Deadline', 'Created At'];
    const rows = penaltiesData.map(penalty => [
        penalty.student_id || '',
        penalty.violation || '',
        penalty.service_type || '',
        penalty.hours || 0,
        penalty.status || '',
        penalty.deadline || '',
        penalty.created_at || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docst_penalties_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessToast('CSV exported successfully!', 'Export Complete');
}

function generateReport() {
    const date = new Date();
    const reportData = {
        generatedAt: date.toISOString(),
        summary: {
            totalPenalties: penaltiesData.length,
            completedPenalties: penaltiesData.filter(p => p.status === 'completed').length,
            pendingPenalties: penaltiesData.filter(p => p.status === 'pending').length,
            inProgressPenalties: penaltiesData.filter(p => p.status === 'in-progress').length,
            totalHours: penaltiesData.reduce((sum, p) => sum + (p.hours || 0), 0),
            totalStudents: studentsData.length,
            totalAdmins: adminsData.length
        },
        topViolations: getTopViolations(),
        recentPenalties: penaltiesData.slice(0, 20),
        monthlyBreakdown: getMonthlyBreakdown()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docst_full_report_${date.toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessToast('Full report generated successfully!', 'Report Ready');
}

function getTopViolations() {
    const counts = {};
    penaltiesData.forEach(p => {
        if (p.violation) counts[p.violation] = (counts[p.violation] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

function getMonthlyBreakdown() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const breakdown = {};
    
    penaltiesData.forEach(penalty => {
        if (penalty.created_at) {
            const date = new Date(penalty.created_at);
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            breakdown[monthYear] = (breakdown[monthYear] || 0) + 1;
        }
    });
    
    return breakdown;
}

// Download predefined reports
window.downloadReport = function(type) {
    const date = new Date();
    let reportContent = {};
    
    switch(type) {
        case 'monthly':
            reportContent = {
                title: 'Monthly Penalty Report',
                date: date.toISOString(),
                totalPenalties: penaltiesData.length,
                completedRate: penaltiesData.length > 0 ? Math.round((penaltiesData.filter(p => p.status === 'completed').length / penaltiesData.length) * 100) : 0,
                data: penaltiesData.slice(0, 100)
            };
            break;
        case 'violations':
            reportContent = {
                title: 'Violation Summary',
                date: date.toISOString(),
                topViolations: getTopViolations(),
                totalViolations: penaltiesData.length
            };
            break;
        case 'compliance':
            const completed = penaltiesData.filter(p => p.status === 'completed').length;
            reportContent = {
                title: 'Student Compliance Report',
                date: date.toISOString(),
                complianceRate: penaltiesData.length > 0 ? Math.round((completed / penaltiesData.length) * 100) : 0,
                totalStudents: studentsData.length,
                totalPenalties: penaltiesData.length
            };
            break;
        case 'students':
            reportContent = {
                title: 'Student List Report',
                date: date.toISOString(),
                totalStudents: studentsData.length,
                students: studentsData.map(s => ({ id: s.id, name: s.name, email: s.email }))
            };
            break;
    }
    
    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docst_${type}_report_${date.toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessToast(`${type} report downloaded!`, 'Download Complete');
};

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
    console.log('Initializing Reports Page...');
    await getCurrentAdminInfo();
    initDarkMode();
    await loadData();
    startNotificationPolling();
    
    document.getElementById('refreshBtn')?.addEventListener('click', loadData);
    document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('yearFilter')?.addEventListener('change', updateAnalytics);
    document.getElementById('monthFilter')?.addEventListener('change', updateAnalytics);
}

init();