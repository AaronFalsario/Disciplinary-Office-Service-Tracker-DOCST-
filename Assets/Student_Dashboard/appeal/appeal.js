import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let myPenalties = []
let myAppeals = []
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
    setTimeout(() => {
        toast.classList.remove('show')
    }, 4000)
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

// Load penalties for dropdown
async function loadPenalties() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        myPenalties = data || []
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        return []
    }
}

// Load appeals
async function loadAppeals() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('appeals')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        myAppeals = data || []
        return myAppeals
    } catch (error) {
        console.error('Error loading appeals:', error)
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

// Populate penalty dropdown
function populatePenaltyDropdown() {
    const select = document.getElementById('penaltySelect')
    if (!select) return
    
    if (myPenalties.length === 0) {
        select.innerHTML = '<option value="">No pending penalties to appeal</option>'
        select.disabled = true
        return
    }
    
    select.innerHTML = '<option value="">Select a penalty to appeal</option>' + 
        myPenalties.map(penalty => `
            <option value="${penalty.id}" data-violation="${escapeHtml(penalty.violation)}" data-hours="${penalty.hours}" data-deadline="${penalty.deadline}">
                ${escapeHtml(penalty.violation)} - ${penalty.hours} hours
            </option>
        `).join('')
    
    select.disabled = false
}

// Show violation details when penalty selected
function setupPenaltySelectListener() {
    const select = document.getElementById('penaltySelect')
    if (!select) return
    
    select.addEventListener('change', () => {
        const selectedOption = select.options[select.selectedIndex]
        const violationName = document.getElementById('violationName')
        const violationHours = document.getElementById('violationHours')
        const violationDeadline = document.getElementById('violationDeadline')
        
        if (select.value && selectedOption && selectedOption.dataset) {
            violationName.textContent = selectedOption.dataset.violation || '—'
            violationHours.textContent = selectedOption.dataset.hours ? `${selectedOption.dataset.hours} hours` : '—'
            violationDeadline.textContent = formatDate(selectedOption.dataset.deadline) || '—'
        } else {
            violationName.textContent = '—'
            violationHours.textContent = '—'
            violationDeadline.textContent = '—'
        }
    })
}

// Submit appeal
async function submitAppeal() {
    const penaltySelect = document.getElementById('penaltySelect')
    const appealReason = document.getElementById('appealReason')
    const supportingStatement = document.getElementById('supportingStatement')
    
    if (!penaltySelect.value) {
        showToast('Please select a penalty to appeal', 'error')
        return
    }
    
    if (!appealReason.value.trim()) {
        showToast('Please provide a reason for your appeal', 'error')
        return
    }
    
    const selectedPenalty = myPenalties.find(p => p.id == penaltySelect.value)
    
    if (!selectedPenalty) {
        showToast('Invalid penalty selected', 'error')
        return
    }
    
    try {
        const { data, error } = await supabase
            .from('appeals')
            .insert([{
                student_id: currentStudent.studentId,
                student_name: currentStudent.name,
                penalty_id: selectedPenalty.id,
                penalty_violation: selectedPenalty.violation,
                penalty_hours: selectedPenalty.hours,
                appeal_reason: appealReason.value.trim(),
                supporting_statement: supportingStatement.value.trim() || null,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
        
        if (error) throw error
        
        showToast('Appeal submitted successfully!', 'success')
        
        // Clear form
        penaltySelect.value = ''
        appealReason.value = ''
        supportingStatement.value = ''
        document.getElementById('violationName').textContent = '—'
        document.getElementById('violationHours').textContent = '—'
        document.getElementById('violationDeadline').textContent = '—'
        
        // Refresh appeals list
        await loadAppeals()
        renderAppealsTable()
        
    } catch (error) {
        console.error('Error submitting appeal:', error)
        showToast('Failed to submit appeal. Please try again.', 'error')
    }
}

// Render appeals table
function renderAppealsTable() {
    const tbody = document.getElementById('appealsTableBody')
    if (!tbody) return
    
    if (myAppeals.length === 0) {
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
    
    tbody.innerHTML = myAppeals.map(appeal => {
        let statusClass = 'status-pending'
        let statusText = 'Pending Review'
        
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
                <td><strong>${escapeHtml(appeal.penalty_violation)}</strong></td>
                <td>${escapeHtml(appeal.appeal_reason.substring(0, 60))}${appeal.appeal_reason.length > 60 ? '...' : ''}</span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${appeal.reviewed_at ? formatDate(appeal.reviewed_at) : '—'}</span>
            </tr>
        `
    }).join('')
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
    
    await loadPenalties()
    await loadAppeals()
    await loadNotifications()
    
    populatePenaltyDropdown()
    setupPenaltySelectListener()
    renderAppealsTable()
    
    // Setup drawer
    setupDrawer(currentStudent.name, currentStudent.studentId)
    setupLogout('logoutBtn')
    
    // Submit button
    document.getElementById('submitAppealBtn')?.addEventListener('click', submitAppeal)
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        document.getElementById('penaltySelect').value = ''
        document.getElementById('appealReason').value = ''
        document.getElementById('supportingStatement').value = ''
        document.getElementById('violationName').textContent = '—'
        document.getElementById('violationHours').textContent = '—'
        document.getElementById('violationDeadline').textContent = '—'
    })
}

init()