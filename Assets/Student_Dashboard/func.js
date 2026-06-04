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

// ============ AUTH CHECK - USES LOCALSTORAGE ONLY ==========
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
        
        // Ensure studentId exists for DB queries (internal use only)
        if (!currentStudent.studentId && currentStudent.id) {
            currentStudent.studentId = currentStudent.id
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent))
        }
        
        await loadMyPenalties()
        
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
    
    const studentId = currentStudent.studentId || currentStudent.id
    
    console.log('Loading reports for student ID:', studentId)
    
    try {
        const { data, error } = await supabase
            .from('incident')
            .select('*')
            .eq('student_id_number', studentId)
            .order('created_at', { ascending: false })
        
        if (error) {
            if (error.code === '42P01') {
                console.log('Reports table not found - skipping')
                return []
            }
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
    
    const searchId = currentStudent.studentId || currentStudent.id || currentStudent.email
    
    console.log('Loading penalties for student - Name:', currentStudent.name)
    
    try {
        let { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', searchId)
            .order('created_at', { ascending: false })
        
        if (!data || data.length === 0) {
            console.log('No penalties found by ID, trying by email...')
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
        
        if (!data || data.length === 0) {
            console.log('No penalties found by email, trying by name...')
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
        console.log('Penalties found for student:', myPenalties.length)
        
        renderPenaltiesTable()
        
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        return []
    }
}

// ============ LOAD NOTIFICATIONS ============
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

// ============ DISPLAY STUDENT INFO - NO ID SHOWN ============
function loadStudentInfo() {
    if (!currentStudent) {
        console.error('No currentStudent in loadStudentInfo')
        return
    }

    console.log('Loading student info - Name:', currentStudent.name)

    const drawerNameEl = document.getElementById('drawerStudentName')
    const drawerIdEl = document.getElementById('drawerStudentId')
    const welcomeEl = document.getElementById('welcomeMessage')
    const dateEl = document.getElementById('currentDate')

    if (drawerNameEl) drawerNameEl.textContent = currentStudent.name || 'Student'
    
    // Hide or remove the student ID display
    if (drawerIdEl) {
        drawerIdEl.textContent = 'Student'
        drawerIdEl.style.display = 'none' // Hide the ID badge entirely
    }
    
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
                 </div>
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

// ============ HELPER FUNCTION FOR OFFENSE LEVEL BADGE ============
function getOffenseClass(offenseLevel) {
    if (!offenseLevel) return '';
    if (offenseLevel.includes('1st') || offenseLevel === '1st Offense') return 'offense-first';
    if (offenseLevel.includes('2nd') || offenseLevel === '2nd Offense') return 'offense-second';
    if (offenseLevel.includes('3rd') || offenseLevel === '3rd Offense') return 'offense-third';
    return '';
}

function getOffenseDisplay(offenseLevel) {
    if (!offenseLevel) return '1st Offense';
    if (offenseLevel === '1st Offense') return '⚠️ 1st Offense (Warning)';
    if (offenseLevel === '2nd Offense') return '⚠️ 2nd Offense';
    if (offenseLevel === '3rd Offense') return '🔴 3rd Offense';
    return offenseLevel;
}

// ============ RENDER PENALTIES TABLE ============
function renderPenaltiesTable() {
    const tbody = document.getElementById('penaltiesTableBody')
    if (!tbody) return

    if (!myPenalties.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-icon">✅</div>
                    <div class="empty-title">No Penalty Records</div>
                    <div class="empty-sub">You have no violations recorded. Great job! 🎉</div>
                 </div>
            </tr>
        `
        return
    }

    tbody.innerHTML = myPenalties.map(p => {
        let statusClass = 'status-pending'
        let statusText = 'Pending'
        
        if (p.status === 'completed') {
            statusClass = 'status-completed'
            statusText = 'Completed'
        } else if (p.status === 'in-progress') {
            statusClass = 'status-in-progress'
            statusText = 'In Progress'
        }
        
        const offenseLevel = p.offense_level || '1st Offense'
        const offenseClass = getOffenseClass(offenseLevel)
        const offenseDisplay = getOffenseDisplay(offenseLevel)
        const isWarning = offenseLevel === '1st Offense'
        
        return `
            <tr>
                <td>${formatDate(p.created_at)}</span>
                <td><strong>${escapeHtml(p.violation)}</strong></span>
                <td><span class="offense-badge ${offenseClass}">${escapeHtml(offenseDisplay)}</span></span>
                <td>${escapeHtml(p.service_type || 'Community Service')}</span>
                <td class="hours-cell">
                    ${isWarning ? '<span class="warning-badge"><i class="fas fa-info-circle"></i> Warning Only</span>' : `${p.hours} hrs`}
                 </span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></span>
                <td>${formatDate(p.deadline)}</span>
                <td>
                    ${p.status !== 'completed' ? 
                        `<button class="view-penalty-btn" data-id="${p.id}" data-violation="${escapeHtml(p.violation)}" data-hours="${p.hours}" data-deadline="${p.deadline}" data-offense="${offenseLevel}">
                            <i class="fas fa-eye"></i> View Details
                        </button>` : 
                        `<span class="completed-badge">✅ Completed</span>`
                    }
                </span>
            </tr>
        `
    }).join('')
    
    document.querySelectorAll('.view-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault()
            const penaltyId = btn.dataset.id
            const violation = btn.dataset.violation
            const hours = btn.dataset.hours
            const deadline = btn.dataset.deadline
            const offense = btn.dataset.offense
            showPenaltyDetails(penaltyId, violation, hours, deadline, offense)
        })
    })
}

// ============ SHOW PENALTY DETAILS MODAL ============
function showPenaltyDetails(penaltyId, violation, hours, deadline, offenseLevel) {
    const existingModal = document.querySelector('.penalty-detail-modal')
    if (existingModal) existingModal.remove()
    
    const offenseDisplay = getOffenseDisplay(offenseLevel || '1st Offense')
    const offenseClass = getOffenseClass(offenseLevel || '1st Offense')
    const isWarning = (offenseLevel || '1st Offense') === '1st Offense'
    
    const modal = document.createElement('div')
    modal.className = 'penalty-detail-modal'
    modal.innerHTML = `
        <div class="penalty-detail-content">
            <div class="penalty-detail-header">
                <h3><i class="fas fa-gavel"></i> Penalty Details</h3>
                <button class="penalty-detail-close">&times;</button>
            </div>
            <div class="penalty-detail-body">
                <div class="detail-row">
                    <span class="detail-label">Violation:</span>
                    <span class="detail-value">${escapeHtml(violation)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Offense Level:</span>
                    <span class="detail-value"><span class="offense-badge ${offenseClass}">${escapeHtml(offenseDisplay)}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Community Service Hours:</span>
                    <span class="detail-value">
                        ${isWarning ? '<span class="warning-badge"><i class="fas fa-info-circle"></i> Warning Only - No hours required</span>' : `${hours} hours`}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Deadline:</span>
                    <span class="detail-value ${isDeadlineSoon(deadline) ? 'urgent' : ''}">
                        ${formatDate(deadline)}
                        ${isDeadlineSoon(deadline) ? ' ⚠️ URGENT!' : ''}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">
                        <span class="status-badge status-${myPenalties.find(p => p.id == penaltyId)?.status || 'pending'}">
                            ${myPenalties.find(p => p.id == penaltyId)?.status || 'Pending'}
                        </span>
                    </span>
                </div>
                ${isWarning ? `
                <div class="detail-row warning-message">
                    <span class="detail-label"><i class="fas fa-info-circle"></i> Note:</span>
                    <span class="detail-value warning-text">This is a first offense - warning only. No community service hours required. Please avoid future violations.</span>
                </div>
                ` : ''}
                <div class="detail-actions">
                    <button class="close-detail-btn">Close</button>
                </div>
            </div>
        </div>
    `
    
    document.body.appendChild(modal)
    
    if (!document.querySelector('#penaltyDetailStyles')) {
        const style = document.createElement('style')
        style.id = 'penaltyDetailStyles'
        style.textContent = `
            .penalty-detail-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            .penalty-detail-content {
                background: white;
                border-radius: 24px;
                width: 90%;
                max-width: 480px;
                animation: slideUp 0.3s ease;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            body.dark-mode .penalty-detail-content {
                background: #1e293b;
            }
            .penalty-detail-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .penalty-detail-header h3 {
                margin: 0;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .penalty-detail-close {
                background: none;
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
            }
            .penalty-detail-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            .penalty-detail-body {
                padding: 24px;
            }
            .detail-row {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e2e8f0;
            }
            body.dark-mode .detail-row {
                border-bottom-color: #334155;
            }
            .detail-label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            body.dark-mode .detail-label {
                color: #94a3b8;
            }
            .detail-value {
                display: block;
                font-size: 15px;
                font-weight: 500;
                color: #1e293b;
            }
            body.dark-mode .detail-value {
                color: #f1f5f9;
            }
            .detail-value.urgent {
                color: #dc2626;
                font-weight: 700;
            }
            .warning-message {
                background: #fef3c7;
                border-radius: 12px;
                padding: 12px;
                margin-top: 8px;
            }
            body.dark-mode .warning-message {
                background: #451a03;
            }
            .warning-text {
                color: #92400e !important;
            }
            body.dark-mode .warning-text {
                color: #fbbf24 !important;
            }
            .offense-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            .offense-first {
                background: #10b981;
                color: white;
            }
            .offense-second {
                background: #f59e0b;
                color: white;
            }
            .offense-third {
                background: #ef4444;
                color: white;
            }
            body.dark-mode .offense-first {
                background: #059669;
            }
            body.dark-mode .offense-second {
                background: #d97706;
            }
            body.dark-mode .offense-third {
                background: #dc2626;
            }
            .warning-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                background: #fef3c7;
                color: #92400e;
            }
            body.dark-mode .warning-badge {
                background: #451a03;
                color: #fbbf24;
            }
            .detail-actions {
                margin-top: 20px;
                text-align: center;
            }
            .close-detail-btn {
                padding: 10px 24px;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            .close-detail-btn:hover {
                background: #1d4ed8;
                transform: translateY(-1px);
            }
            @keyframes slideUp {
                from {
                    transform: translateY(30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `
        document.head.appendChild(style)
    }
    
    const closeBtn = modal.querySelector('.penalty-detail-close')
    const closeDetailBtn = modal.querySelector('.close-detail-btn')
    
    closeBtn.addEventListener('click', () => modal.remove())
    closeDetailBtn.addEventListener('click', () => modal.remove())
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove()
    })
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
        <div class="deadline-item" data-id="${p.id}" data-violation="${escapeHtml(p.violation)}" data-hours="${p.hours}" data-deadline="${p.deadline}" data-offense="${p.offense_level || '1st Offense'}">
            <div class="deadline-title">${escapeHtml(p.violation)}</div>
            <div class="deadline-date ${isDeadlineSoon(p.deadline) ? 'urgent' : ''}">
                ⏰ ${formatDate(p.deadline)}
                ${isDeadlineSoon(p.deadline) ? ' - URGENT!' : ''}
            </div>
        </div>
    `).join('')
    
    document.querySelectorAll('.deadline-item').forEach(item => {
        item.addEventListener('click', () => {
            const penaltyId = item.dataset.id
            const violation = item.dataset.violation
            const hours = item.dataset.hours
            const deadline = item.dataset.deadline
            const offense = item.dataset.offense
            const penalty = myPenalties.find(p => p.id == penaltyId)
            if (penalty) {
                showPenaltyDetails(penaltyId, violation, hours, deadline, offense)
            }
        })
    })
}

// ============ HELPER FUNCTIONS ============
function getStatusIcon(status) {
    switch(status) {
        case 'pending': return '⏳'
        case 'completed': return '✅'
        case 'resolved': return '✓'
        case 'penalty_issued': return '⚠️'
        case 'in-progress': return '🔄'
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

// ============ SETUP REAL-TIME PENALTY UPDATES ============
function setupRealtimePenaltyUpdates() {
    const penaltyChannel = supabase
        .channel('penalty-updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'penalties'
        }, async (payload) => {
            console.log('Penalty update detected:', payload)
            
            const penaltyStudentId = payload.new?.student_id || payload.old?.student_id
            const penaltyStudentEmail = payload.new?.student_email || payload.old?.student_email
            
            if (penaltyStudentId === currentStudent.studentId || 
                penaltyStudentEmail === currentStudent.email ||
                (payload.new?.student_name && payload.new.student_name.toLowerCase().includes(currentStudent.name.toLowerCase()))) {
                console.log('Penalty belongs to current student, refreshing...')
                await loadMyPenalties()
                updateStats()
                renderPenaltiesTable()
                renderActivityFeed()
                renderDeadlines()
                
                if (payload.eventType === 'INSERT') {
                    const offenseLevel = payload.new?.offense_level || '1st Offense'
                    const isWarning = offenseLevel === '1st Offense'
                    const message = isWarning 
                        ? `Warning issued: ${payload.new.violation} (First offense - warning only)`
                        : `New penalty issued: ${payload.new.violation} (${payload.new.hours} hours)`
                    showSuccessToast(message, 'Penalty Added')
                } else if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
                    showSuccessToast(`Penalty completed: ${payload.new.violation}`, 'Good Job!')
                }
            }
        })
        .subscribe()
    
    return penaltyChannel
}

function showSuccessToast(message, title) {
    const toast = document.createElement('div')
    toast.className = 'custom-toast'
    toast.innerHTML = `
        <div class="toast-icon">✅</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `
    document.body.appendChild(toast)
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease'
        setTimeout(() => toast.remove(), 300)
    }, 4000)
}

const animationStyle = document.createElement('style')
animationStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .custom-toast {
        font-family: 'DM Sans', sans-serif;
    }
    body.dark-mode .custom-toast {
        background: #059669;
    }
`
document.head.appendChild(animationStyle)

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...')
    
    const isAuth = await checkAuth()
    if (!isAuth) return
    
    loadStudentInfo()
    await refreshDashboard()
    initDarkMode()
    initNotification()
    
    setupRealtimePenaltyUpdates()
    
    // Setup drawer with student name only (no ID)
    setupDrawer(currentStudent.name, 'Student')
    setupLogout('logoutBtn')
    
    setInterval(async () => {
        await loadMyPenalties()
        updateStats()
        renderPenaltiesTable()
        renderDeadlines()
    }, 30000)
})