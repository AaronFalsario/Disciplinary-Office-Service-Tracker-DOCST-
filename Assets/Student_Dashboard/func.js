// ============ SUPABASE CONFIGURATION - USING VITE ============
import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let myReports = []
let myPenalties = []
let notifications = []
let unreadCount = 0

// ============ GET STUDENT INITIALS ============
function getStudentInitials(fullName) {
    if (!fullName || fullName === 'Student') return 'ST';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateDrawerAvatar(studentName) {
    const drawerAvatar = document.querySelector('.drawer-avatar');
    if (drawerAvatar) {
        const initials = getStudentInitials(studentName);
        drawerAvatar.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = initials;
        span.style.fontSize = '18px';
        span.style.fontWeight = '600';
        span.style.color = 'white';
        drawerAvatar.appendChild(span);
    }
}

// ============ AUTH CHECK ============
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent')
    console.log('Stored student:', stored)
    
    if (!stored) {
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
    
    try {
        currentStudent = JSON.parse(stored)
        console.log('Parsed student:', currentStudent)
        
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('email', currentStudent.email)
            .maybeSingle()
        
        if (studentError) {
            console.error('Error fetching student:', studentError)
        }
        
        if (studentData) {
            currentStudent = {
                id: studentData.id,
                email: studentData.email,
                name: studentData.name,
                studentId: studentData.id_number,
                course: studentData.course,
                yearLevel: studentData.year_level,
                status: studentData.status
            }
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent))
            console.log('Updated student from DB:', currentStudent)
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            localStorage.removeItem('currentStudent')
            window.location.href = '/Assets/Student Authentication/Student.html'
            return false
        }
        
        return true
    } catch (e) {
        console.error('Auth check failed:', e)
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
}

// ============ LOAD STUDENT'S REPORTS ============
async function loadMyReports() {
    if (!currentStudent) return []
    
    console.log('Loading reports for student ID:', currentStudent.studentId)
    
    try {
        const { data, error } = await supabase
            .from('incident')
            .select('*')
            .eq('student_id_number', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error('Reports error:', error)
            return []
        }
        
        myReports = data || []
        console.log('Reports found:', myReports.length)
        return myReports
    } catch (error) {
        console.error('Error loading reports:', error)
        return []
    }
}

// ============ LOAD STUDENT'S PENALTIES ============
async function loadMyPenalties() {
    if (!currentStudent) return []
    
    console.log('Loading penalties for student ID:', currentStudent.studentId)
    
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error('Penalties error:', error)
            return []
        }
        
        myPenalties = data || []
        console.log('Penalties found:', myPenalties.length)
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        return []
    }
}

// ============ LOAD NOTIFICATIONS ============
async function loadNotifications() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
            .limit(10)
        
        if (error) throw error
        
        notifications = data || []
        unreadCount = notifications.filter(n => !n.is_read).length
        updateNotificationBadge()
        return notifications
    } catch (error) {
        console.error('Error loading notifications:', error)
        return []
    }
}

// ============ NOTIFICATION UI FUNCTIONS ============
function updateNotificationBadge() {
    const notifyBtn = document.getElementById('notifyBtn')
    if (!notifyBtn) return
    
    const existingBadge = notifyBtn.querySelector('.notification-badge')
    if (existingBadge) existingBadge.remove()
    
    if (unreadCount > 0) {
        const badge = document.createElement('span')
        badge.className = 'notification-badge'
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount
        notifyBtn.appendChild(badge)
    }
}

async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
        
        if (error) throw error
        
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.is_read) {
            notification.is_read = true
            unreadCount--
            updateNotificationBadge()
            renderNotificationList()
        }
    } catch (error) {
        console.error('Error marking as read:', error)
    }
}

async function markAllAsRead() {
    if (unreadCount === 0) return
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('student_id', currentStudent.studentId)
            .eq('is_read', false)
        
        if (error) throw error
        
        notifications.forEach(n => n.is_read = true)
        unreadCount = 0
        updateNotificationBadge()
        renderNotificationList()
    } catch (error) {
        console.error('Error marking all as read:', error)
    }
}

function getNotificationIcon(type) {
    switch(type) {
        case 'penalty': return 'fa-gavel'
        case 'report': return 'fa-file-alt'
        case 'deadline': return 'fa-hourglass-half'
        default: return 'fa-bell'
    }
}

function renderNotificationList() {
    const container = document.getElementById('notificationList')
    if (!container) return
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <span>You're all caught up!</span>
            </div>
        `
        return
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.is_read ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-icon ${notification.type || 'system'}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-time">${formatRelativeTime(new Date(notification.created_at))}</div>
            </div>
            ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
        </div>
    `).join('')
    
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = parseInt(item.dataset.id)
            const notification = notifications.find(n => n.id === id)
            if (notification && !notification.is_read) {
                await markAsRead(id)
            }
            
            const dropdown = document.getElementById('notificationDropdown')
            const overlay = document.getElementById('notificationOverlay')
            if (dropdown) dropdown.classList.remove('show')
            if (overlay) overlay.classList.remove('active')
        })
    })
}

function setupNotificationClickOutside() {
    const overlay = document.getElementById('notificationOverlay')
    const dropdown = document.getElementById('notificationDropdown')
    const notifyBtn = document.getElementById('notifyBtn')
    
    if (!overlay || !dropdown || !notifyBtn) return
    
    function closeDropdown() {
        dropdown.classList.remove('show')
        overlay.classList.remove('active')
    }
    
    function openDropdown() {
        dropdown.classList.add('show')
        overlay.classList.add('active')
    }
    
    notifyBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await loadNotifications()
        renderNotificationList()
        
        if (dropdown.classList.contains('show')) {
            closeDropdown()
        } else {
            openDropdown()
        }
    })
    
    overlay.addEventListener('click', closeDropdown)
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('show')) {
            closeDropdown()
        }
    })
}

// ============ DISPLAY STUDENT INFO ============
function loadStudentInfo() {
    if (!currentStudent) {
        console.error('No currentStudent in loadStudentInfo')
        return
    }

    console.log('Loading student info - Name:', currentStudent.name, 'ID:', currentStudent.studentId)

    const drawerNameEl = document.getElementById('drawerStudentName')
    const drawerIdEl = document.getElementById('drawerStudentId')
    const welcomeEl = document.getElementById('welcomeMessage')
    const dateEl = document.getElementById('currentDate')

    if (drawerNameEl) drawerNameEl.textContent = currentStudent.name || 'Student'
    if (drawerIdEl) drawerIdEl.textContent = currentStudent.studentId ? `ID: ${currentStudent.studentId}` : 'Student'
    
    updateDrawerAvatar(currentStudent.name || 'Student')

    const hour = new Date().getHours()
    let greeting = 'Hello'
    if (hour < 12) greeting = 'Good morning'
    else if (hour < 18) greeting = 'Good afternoon'
    else greeting = 'Good evening'

    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${currentStudent.name || 'Student'} 👋`

    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }
}

// ============ UPDATE STATS ============
function updateStats() {
    const pendingPenalties = myPenalties.filter(p => p.status !== 'completed').length
    const completedHours = myPenalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const totalViolations = myPenalties.length
    const totalReports = myReports.length
    const pendingReports = myReports.filter(r => r.status === 'pending').length
    
    const totalHours = myPenalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const complianceRate = totalHours ? Math.round((completedHours / totalHours) * 100) : 100

    const pendingEl = document.getElementById('pendingPenalties')
    const completedEl = document.getElementById('completedHours')
    const violationsEl = document.getElementById('totalViolations')
    const rateEl = document.getElementById('complianceRate')
    const reportsEl = document.getElementById('totalReports')
    const pendingReportsEl = document.getElementById('pendingReports')

    if (pendingEl) pendingEl.textContent = pendingPenalties
    if (completedEl) completedEl.textContent = completedHours
    if (violationsEl) violationsEl.textContent = totalViolations
    if (rateEl) rateEl.textContent = `${complianceRate}%`
    if (reportsEl) reportsEl.textContent = totalReports
    if (pendingReportsEl) pendingReportsEl.textContent = pendingReports
    
    console.log('Stats updated:', { pendingPenalties, completedHours, totalViolations, complianceRate })
}

// ============ RENDER REPORTS TABLE ============
function renderReportsTable() {
    const tbody = document.getElementById('reportsTableBody')
    if (!tbody) return

    if (!myReports.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div>📋 No reports found</div>
                    <small>Submit a report from the dashboard</small>
                </span>
            </tr>
        `
        return
    }

    tbody.innerHTML = myReports.map(r => `
        <tr>
            <td>${formatDate(r.created_at)}</span>
            <td><strong>${escapeHtml(r.title)}</strong></span>
            <td>${escapeHtml(r.category || 'General')}</span>
            <td>${escapeHtml(r.location || 'N/A')}</span>
            <td>
                <span class="status-badge status-${r.status}">
                    ${getStatusIcon(r.status)} ${r.status}
                </span>
            </span>
            <td>
                ${r.status === 'penalty_issued' ? 
                    '<span class="badge penalty">⚠️ Penalty Issued</span>' : 
                    r.status === 'resolved' ? 
                    '<span class="badge resolved">✅ Resolved</span>' : 
                    '<span class="badge pending">⏳ Pending</span>'
                }
            </span>
        </tr>
    `).join('')
}

// ============ RENDER PENALTIES TABLE ============
function renderPenaltiesTable() {
    const tbody = document.getElementById('penaltiesTableBody')
    if (!tbody) return

    if (!myPenalties.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div>⚖️ No penalty records found</div>
                    <small>Complete your assigned community service</small>
                </span>
            </tr>
        `
        return
    }

    tbody.innerHTML = myPenalties.map(p => `
        <tr>
            <td>${escapeHtml(p.violation)}</span>
            <td>${escapeHtml(p.service_type || 'Community Service')}</span>
            <td>${p.hours} hrs</span>
            <td>
                <span class="status-badge status-${p.status}">
                    ${getStatusIcon(p.status)} ${p.status}
                </span>
            </span>
            <td>${formatDate(p.deadline)}</span>
        </tr>
    `).join('')
}

// ============ RENDER ACTIVITY FEED ============
function renderActivityFeed() {
    const container = document.getElementById('activityContainer')
    if (!container) return

    const activities = []

    myReports.forEach(r => {
        activities.push({
            text: `📝 Report submitted: ${r.title}`,
            time: new Date(r.created_at),
            icon: '📝'
        })
        
        if (r.status === 'resolved') {
            activities.push({
                text: `✅ Report resolved: ${r.title}`,
                time: new Date(r.updated_at || r.created_at),
                icon: '✅'
            })
        }
    })

    myPenalties.forEach(p => {
        activities.push({
            text: `⚠️ Penalty issued: ${p.violation} (${p.hours} hours)`,
            time: new Date(p.created_at),
            icon: '⚠️'
        })
        
        if (p.status === 'completed') {
            activities.push({
                text: `🎉 Completed ${p.hours} hours for ${p.violation}`,
                time: new Date(p.updated_at || p.created_at),
                icon: '🎉'
            })
        }
    })

    activities.sort((a, b) => b.time - a.time)

    if (!activities.length) {
        container.innerHTML = `<div class="empty-state">📭 No recent activity</div>`
        return
    }

    container.innerHTML = activities.slice(0, 5).map(a => `
        <div class="activity-item">
            <div class="activity-icon">${a.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${escapeHtml(a.text)}</div>
                <div class="activity-time">${formatRelativeTime(a.time)}</div>
            </div>
        </div>
    `).join('')
}

// ============ RENDER UPCOMING DEADLINES ============
function renderDeadlines() {
    const container = document.getElementById('deadlinesContainer')
    if (!container) return

    const upcoming = myPenalties
        .filter(p => p.status !== 'completed' && p.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5)

    if (!upcoming.length) {
        container.innerHTML = `<div class="empty-state">📅 No upcoming deadlines</div>`
        return
    }

    container.innerHTML = upcoming.map(p => `
        <div class="deadline-item">
            <div class="deadline-title">${escapeHtml(p.violation)}</div>
            <div class="deadline-date ${isDeadlineSoon(p.deadline) ? 'urgent' : ''}">
                ⏰ ${formatDate(p.deadline)}
                ${isDeadlineSoon(p.deadline) ? ' - URGENT!' : ''}
            </div>
        </div>
    `).join('')
}

// ============ HELPER FUNCTIONS ============
function getStatusIcon(status) {
    switch(status) {
        case 'pending': return '⏳'
        case 'completed': return '✅'
        case 'resolved': return '✓'
        case 'penalty_issued': return '⚠️'
        default: return '📌'
    }
}

function isDeadlineSoon(date) {
    if (!date) return false
    const daysLeft = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 3 && daysLeft >= 0
}

function formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
}

function formatRelativeTime(date) {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    if (hrs < 24) return `${hrs} hr ago`
    if (days < 7) return `${days} day ago`
    return new Date(date).toLocaleDateString()
}

function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// ============ REFRESH ALL DATA ============
async function refreshDashboard() {
    console.log('Refreshing dashboard...')
    await loadMyReports()
    await loadMyPenalties()
    await loadNotifications()
    updateStats()
    renderReportsTable()
    renderPenaltiesTable()
    renderActivityFeed()
    renderDeadlines()
}

// ============ DARK MODE ============
function updateDarkModeIcon(btn, isDark) {
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
                <line x1="4.22" y1="19.07" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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

function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    } else if (savedMode === 'disabled') {
        document.body.classList.remove('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('docst_dark_mode', 'disabled');
    }
    
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (darkModeBtn) {
        const isDark = document.body.classList.contains('dark-mode');
        updateDarkModeIcon(darkModeBtn, isDark);
        
        darkModeBtn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const nowDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
            updateDarkModeIcon(darkModeBtn, nowDark);
            
            const notification = document.createElement('div');
            notification.textContent = nowDark ? '🌙 Dark mode enabled' : '☀️ Light mode enabled';
            notification.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; padding: 10px 20px;
                background: ${nowDark ? '#1E293B' : '#2563EB'}; color: white;
                border-radius: 8px; font-size: 13px; z-index: 10000;
                animation: fadeInOut 2s ease;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        };
    }
}

// Add dark mode styles
const darkModeStyle = document.createElement('style');
darkModeStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(20px); }
        15% { opacity: 1; transform: translateX(0); }
        85% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(darkModeStyle);

// ============ NOTIFICATION BUTTON INIT ============
function initNotification() {
    setupNotificationClickOutside()
    
    const markAllBtn = document.getElementById('markAllReadBtn')
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await markAllAsRead()
        })
    }
    
    const viewAllLink = document.getElementById('viewAllLink')
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const dropdown = document.getElementById('notificationDropdown')
            const overlay = document.getElementById('notificationOverlay')
            if (dropdown) dropdown.classList.remove('show')
            if (overlay) overlay.classList.remove('active')
        })
    }
}

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...')
    
    const isAuth = await checkAuth()
    if (!isAuth) return
    
    loadStudentInfo()
    await refreshDashboard()
    initDarkMode()
    initNotification()
    
    // Setup centralized drawer
    setupDrawer(currentStudent.name, currentStudent.studentId)
    setupLogout('logoutBtn')
})