import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let myPenalties = []
let notifications = []
let unreadCount = 0

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

function getStudentInitials(name) {
    if (!name) return 'ST'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function loadCurrentStudent() {
    const stored = localStorage.getItem('currentStudent')
    if (!stored) {
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
    currentStudent = JSON.parse(stored)
    console.log('Current student loaded:', currentStudent.name)
    return true
}

async function loadMyPenalties() {
    if (!currentStudent) return []
    
    const studentId = currentStudent.studentId || currentStudent.id
    
    console.log('Loading penalties for student:', currentStudent.name)
    
    try {
        let { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
        
        if ((!data || data.length === 0) && currentStudent.email) {
            console.log('Trying by email...')
            const { data: emailData, error: emailError } = await supabase
                .from('penalties')
                .select('*')
                .eq('student_email', currentStudent.email)
                .order('created_at', { ascending: false })
            
            if (!emailError && emailData && emailData.length > 0) {
                data = emailData
                error = null
            }
        }
        
        if ((!data || data.length === 0) && currentStudent.name) {
            console.log('Trying by name...')
            const { data: nameData, error: nameError } = await supabase
                .from('penalties')
                .select('*')
                .ilike('student_name', `%${currentStudent.name}%`)
                .order('created_at', { ascending: false })
            
            if (!nameError && nameData && nameData.length > 0) {
                data = nameData
                error = null
            }
        }
        
        if (error) throw error
        
        myPenalties = data || []
        console.log('Penalties found:', myPenalties.length)
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        myPenalties = []
        return []
    }
}

// ============ NOTIFICATION FUNCTIONS ============
async function loadNotifications() {
    if (!currentStudent) return []
    
    const studentId = currentStudent.studentId || currentStudent.id
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('student_id', studentId)
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
    
    const studentId = currentStudent.studentId || currentStudent.id
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('student_id', studentId)
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

// ============ STATS FUNCTIONS ============
function updateStats() {
    const totalViolations = myPenalties.length
    const pending = myPenalties.filter(p => p.status !== 'completed').length
    const completedHours = myPenalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const totalHours = myPenalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const complianceRate = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 100
    
    const pendingEl = document.getElementById('pendingPenalties')
    const completedEl = document.getElementById('completedHours')
    const violationsEl = document.getElementById('totalViolations')
    const rateEl = document.getElementById('complianceRate')
    
    if (pendingEl) pendingEl.textContent = pending
    if (completedEl) completedEl.textContent = completedHours
    if (violationsEl) violationsEl.textContent = totalViolations
    if (rateEl) rateEl.textContent = `${complianceRate}%`
    
    console.log('Stats updated:', { totalViolations, pending, completedHours, complianceRate })
}

// ============ RENDER PENALTIES TABLE ============
function renderPenaltiesTable() {
    const tbody = document.getElementById('penaltiesTableBody')
    if (!tbody) return
    
    if (myPenalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-icon">✅</div>
                    <div class="empty-title">No Penalty Records</div>
                    <div class="empty-sub">You have no violations recorded. Great job! 🎉</div>
                </div>
            </td>
        `
        return
    }
    
    tbody.innerHTML = myPenalties.map(penalty => {
        let statusClass = 'status-pending'
        let statusText = 'Pending'
        
        if (penalty.status === 'completed') {
            statusClass = 'status-completed'
            statusText = 'Completed'
        } else if (penalty.status === 'in-progress') {
            statusClass = 'status-in-progress'
            statusText = 'In Progress'
        }
        
        return `
            <tr>
                <td>${formatDate(penalty.created_at)}</span>
                <td><strong>${escapeHtml(penalty.violation)}</strong></span>
                <td>${escapeHtml(penalty.service_type || 'Community Service')}</span>
                <td>${penalty.hours} hrs</span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></span>
                <td>${formatDate(penalty.deadline)}</span>
                <td>
                    <button class="view-penalty-btn" data-id="${penalty.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </span>
            </tr>
        `
    }).join('')
    
    document.querySelectorAll('.view-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const penaltyId = parseInt(btn.dataset.id)
            const penalty = myPenalties.find(p => p.id === penaltyId)
            if (penalty) {
                showPenaltyDetails(penalty)
            }
        })
    })
}

// ============ PENALTY DETAIL MODAL FUNCTIONS ============
function showPenaltyDetails(penalty) {
    const modal = document.getElementById('penaltyModal')
    if (!modal) {
        console.error('Modal element not found')
        return
    }
    
    // Set modal content
    const violationEl = document.getElementById('modalViolation')
    const serviceTypeEl = document.getElementById('modalServiceType')
    const hoursEl = document.getElementById('modalHours')
    const statusEl = document.getElementById('modalStatus')
    const dateIssuedEl = document.getElementById('modalDateIssued')
    const deadlineEl = document.getElementById('modalDeadline')
    const descriptionEl = document.getElementById('modalDescription')
    
    if (violationEl) violationEl.textContent = penalty.violation || 'N/A'
    if (serviceTypeEl) serviceTypeEl.textContent = penalty.service_type || 'Community Service'
    if (hoursEl) hoursEl.textContent = `${penalty.hours} hour${penalty.hours !== 1 ? 's' : ''}`
    
    // Format status with proper styling
    let statusText = penalty.status || 'pending'
    let statusDisplay = statusText.charAt(0).toUpperCase() + statusText.slice(1)
    if (statusText === 'in-progress') statusDisplay = 'In Progress'
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-badge status-${statusText}">${statusDisplay}</span>`
    }
    
    if (dateIssuedEl) dateIssuedEl.textContent = formatDate(penalty.created_at)
    if (deadlineEl) deadlineEl.textContent = formatDate(penalty.deadline)
    
    const notes = penalty.notes || penalty.description || 'No additional notes provided.'
    if (descriptionEl) descriptionEl.textContent = notes
    
    // Show modal
    modal.classList.add('show')
}

function closePenaltyModal() {
    const modal = document.getElementById('penaltyModal')
    if (modal) modal.classList.remove('show')
}

function initModal() {
    const closeBtn = document.getElementById('closePenaltyModal')
    const modalCloseBtn = document.getElementById('modalCloseBtn')
    const modal = document.getElementById('penaltyModal')
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closePenaltyModal)
    }
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closePenaltyModal)
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePenaltyModal()
            }
        })
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            closePenaltyModal()
        }
    })
}

// ============ DARK MODE ============
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
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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

// ============ ACTIVITY FEED & DEADLINES ============
function updateActivityFeed() {
    const container = document.getElementById('activityContainer')
    if (!container) return
    
    const activities = []
    
    myPenalties.forEach(penalty => {
        if (penalty.created_at) {
            activities.push({
                text: `⚠️ Penalty issued: ${penalty.violation} (${penalty.hours} hours)`,
                time: new Date(penalty.created_at)
            })
        }
        
        if (penalty.status === 'completed') {
            activities.push({
                text: `🎉 Completed ${penalty.hours} hours for ${penalty.violation}`,
                time: new Date(penalty.updated_at || penalty.created_at)
            })
        }
    })
    
    activities.sort((a, b) => b.time - a.time)
    const recentActivities = activities.slice(0, 5)
    
    if (recentActivities.length === 0) {
        container.innerHTML = `<div class="empty-state">📭 No recent activity</div>`
        return
    }
    
    container.innerHTML = recentActivities.map(a => `
        <div class="activity-item">
            <div class="activity-icon">📋</div>
            <div class="activity-content">
                <div class="activity-text">${escapeHtml(a.text)}</div>
                <div class="activity-time">${formatRelativeTime(a.time)}</div>
            </div>
        </div>
    `).join('')
}

function updateDeadlines() {
    const container = document.getElementById('deadlinesContainer')
    if (!container) return
    
    const upcoming = myPenalties
        .filter(p => p.status !== 'completed' && p.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5)
    
    if (upcoming.length === 0) {
        container.innerHTML = `<div class="empty-state">📅 No upcoming deadlines</div>`
        return
    }
    
    container.innerHTML = upcoming.map(p => `
        <div class="deadline-item" data-id="${p.id}">
            <div class="deadline-title">${escapeHtml(p.violation)}</div>
            <div class="deadline-date ${isDeadlineSoon(p.deadline) ? 'urgent' : ''}">
                ⏰ ${formatDate(p.deadline)}
                ${isDeadlineSoon(p.deadline) ? ' - URGENT!' : ''}
            </div>
        </div>
    `).join('')
}

function isDeadlineSoon(date) {
    if (!date) return false
    const daysLeft = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 3 && daysLeft >= 0
}

// ============ REFRESH ============
async function refreshDashboard() {
    await loadMyPenalties()
    updateStats()
    renderPenaltiesTable()
    updateActivityFeed()
    updateDeadlines()
    console.log('Dashboard refreshed')
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing penalties page...')
    
    if (!loadCurrentStudent()) return
    
    initDarkMode()
    initNotification()
    initModal()
    await refreshDashboard()
    await loadNotifications()
    
    // Setup centralized drawer - student name only, no ID
    setupDrawer(currentStudent.name, 'Student')
    setupLogout('logoutBtn')
    
    // Set page title with student name
    const hour = new Date().getHours()
    let greeting = 'Good morning'
    if (hour >= 12 && hour < 18) greeting = 'Good afternoon'
    if (hour >= 18) greeting = 'Good evening'
    
    const pageTitle = document.querySelector('.page-title')
    if (pageTitle) {
        pageTitle.textContent = `${greeting}, ${currentStudent.name || 'Student'}`
    }
    
    console.log('Penalties page initialized')
}

// Start initialization
init()