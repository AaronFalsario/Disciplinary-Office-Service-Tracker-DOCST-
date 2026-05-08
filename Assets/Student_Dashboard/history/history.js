import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let completedPenalties = []
let appealsHistory = []
let reportsHistory = []
let notifications = []
let unreadCount = 0

// Helper functions
function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
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

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification')
    toast.textContent = message
    toast.className = `toast-notification show ${type}`
    setTimeout(() => toast.classList.remove('show'), 4000)
}

// Auth check
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent')
    if (!stored) {
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
    
    try {
        currentStudent = JSON.parse(stored)
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

// Load completed penalties
async function loadCompletedPenalties() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .eq('status', 'completed')
            .order('updated_at', { ascending: false })
        
        if (error) throw error
        completedPenalties = data || []
        return completedPenalties
    } catch (error) {
        console.error('Error loading completed penalties:', error)
        return []
    }
}

// Load appeals history
async function loadAppealsHistory() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('appeals')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        appealsHistory = data || []
        return appealsHistory
    } catch (error) {
        console.error('Error loading appeals history:', error)
        return []
    }
}

// Load reports history
async function loadReportsHistory() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('incident')
            .select('*')
            .eq('student_id_number', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        reportsHistory = data || []
        return reportsHistory
    } catch (error) {
        console.error('Error loading reports history:', error)
        return []
    }
}

// Load notifications
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

// Notification functions
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
        await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
        
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
        await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('student_id', currentStudent.studentId)
            .eq('is_read', false)
        
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

// Update stats
function updateStats() {
    const totalCompleted = completedPenalties.length
    const totalHours = completedPenalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const totalViolations = completedPenalties.length
    const totalReports = reportsHistory.length
    
    document.getElementById('completedPenalties').textContent = totalCompleted
    document.getElementById('totalHours').textContent = totalHours
    document.getElementById('totalViolations').textContent = totalViolations
    document.getElementById('totalReports').textContent = totalReports
}

// Render penalties history
function renderPenaltiesHistory() {
    const tbody = document.getElementById('penaltiesHistoryBody')
    if (!tbody) return
    
    if (completedPenalties.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-title">No Completed Penalties</div>
                <div class="empty-sub">Complete your community service to see it here</div>
            </td
        </tr>
        `
        return
    }
    
    tbody.innerHTML = completedPenalties.map(penalty => `
        <tr>
            <td><strong>${escapeHtml(penalty.violation)}</strong></span>
            <td>${escapeHtml(penalty.service_type || 'Community Service')}</span>
            <td>${penalty.hours} hrs</span>
            <td>${formatDate(penalty.updated_at || penalty.created_at)}</span>
            <td>
                <a href="#" class="certificate-link" data-penalty-id="${penalty.id}">
                    <i class="fas fa-download"></i> View Certificate
                </a>
            </span>
        </tr>
    `).join('')
    
    // Add certificate click handlers
    document.querySelectorAll('.certificate-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            showToast('Certificate feature coming soon!', 'info')
        })
    })
}

// Render appeals history
function renderAppealsHistory() {
    const tbody = document.getElementById('appealsHistoryBody')
    if (!tbody) return
    
    if (appealsHistory.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">No Appeals Found</div>
                <div class="empty-sub">Submit an appeal to see it here</div>
            </td
        </tr>
        `
        return
    }
    
    tbody.innerHTML = appealsHistory.map(appeal => {
        let statusClass = 'status-pending'
        let statusText = 'Pending'
        
        if (appeal.status === 'approved') {
            statusClass = 'status-approved'
            statusText = 'Approved'
        } else if (appeal.status === 'rejected') {
            statusClass = 'status-rejected'
            statusText = 'Rejected'
        }
        
        return `
            <tr>
                <td>${formatDate(appeal.created_at)}</span>
                <td><strong>${escapeHtml(appeal.penalty_violation)}</strong></span>
                <td>${escapeHtml(appeal.appeal_reason.substring(0, 60))}${appeal.appeal_reason.length > 60 ? '...' : ''}</span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></span>
                <td>${appeal.decision_reason ? escapeHtml(appeal.decision_reason.substring(0, 50)) : '—'}</span>
            </tr>
        `
    }).join('')
}

// Render reports history
function renderReportsHistory() {
    const tbody = document.getElementById('reportsHistoryBody')
    if (!tbody) return
    
    if (reportsHistory.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-title">No Reports Found</div>
                <div class="empty-sub">Submit a report to see it here</div>
            </td
        </tr>
        `
        return
    }
    
    tbody.innerHTML = reportsHistory.map(report => {
        let statusClass = 'status-pending'
        let statusText = 'Pending'
        
        if (report.status === 'resolved') {
            statusClass = 'status-resolved'
            statusText = 'Resolved'
        } else if (report.status === 'penalty_issued') {
            statusClass = 'status-completed'
            statusText = 'Penalty Issued'
        }
        
        return `
            <tr>
                <td>${formatDate(report.created_at)}</span>
                <td><strong>${escapeHtml(report.title)}</strong></span>
                <td>${escapeHtml(report.category || 'General')}</span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></span>
                <td>${report.resolution_notes ? escapeHtml(report.resolution_notes.substring(0, 50)) : '—'}</span>
            </tr>
        `
    }).join('')
}

// Tab functionality
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn')
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'))
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active')
            })
            
            // Add active class to clicked tab
            tab.classList.add('active')
            
            // Show corresponding content
            const targetContent = document.getElementById(`${tabId}-tab`)
            if (targetContent) {
                targetContent.classList.add('active')
            }
        })
    })
}

// Dark mode
function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode')
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode')
    }
    
    const darkModeBtn = document.getElementById('darkModeToggle')
    if (darkModeBtn) {
        const isDark = document.body.classList.contains('dark-mode')
        darkModeBtn.innerHTML = isDark ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
        ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `
        
        darkModeBtn.onclick = () => {
            document.body.classList.toggle('dark-mode')
            const nowDark = document.body.classList.contains('dark-mode')
            localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled')
            
            if (nowDark) {
                darkModeBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                    </svg>
                `
            } else {
                darkModeBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                `
            }
        }
    }
}

// Initialize
async function init() {
    const isAuth = await checkAuth()
    if (!isAuth) return
    
    initDarkMode()
    initNotification()
    initTabs()
    
    await loadCompletedPenalties()
    await loadAppealsHistory()
    await loadReportsHistory()
    await loadNotifications()
    
    updateStats()
    renderPenaltiesHistory()
    renderAppealsHistory()
    renderReportsHistory()
    
    setupDrawer(currentStudent.name, currentStudent.studentId)
    setupLogout('logoutBtn')
}

init()