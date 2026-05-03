const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'



import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let myReports = []
let myPenalties = []

// Checking of authentication

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

//  Load students report

async function loadMyReports() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        myReports = data || []
        return myReports
    } catch (error) {
        console.error('Error loading reports:', error)
        return []
    }
}

//Load the student penalties function

async function loadMyPenalties() {
    if (!currentStudent) return []
    
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        myPenalties = data || []
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        return []
    }
}

// ============ DISPLAY STUDENT INFO ============

function loadStudentInfo() {
    if (!currentStudent) return

    const nameEl = document.getElementById('studentName')
    const idEl = document.getElementById('studentId')
    const welcomeEl = document.getElementById('welcomeMessage')
    const dateEl = document.getElementById('currentDate')

    if (nameEl) nameEl.textContent = currentStudent.name
    if (idEl) idEl.textContent = `ID: ${currentStudent.studentId}`

    const hour = new Date().getHours()
    let greeting = 'Hello'
    if (hour < 12) greeting = 'Good morning'
    else if (hour < 18) greeting = 'Good afternoon'
    else greeting = 'Good evening'

    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${currentStudent.name} 👋`

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
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = myReports.map(r => `
        <tr>
            <td>${formatDate(r.created_at)}</td>
            <td><strong>${escapeHtml(r.title)}</strong></td>
            <td>${escapeHtml(r.category || 'General')}</td>
            <td>${escapeHtml(r.location || 'N/A')}</td>
            <td>
                <span class="status-badge status-${r.status}">
                    ${getStatusIcon(r.status)} ${r.status}
                </span>
            </td>
            <td>
                ${r.status === 'penalty_issued' ? 
                    '<span class="badge penalty">⚠️ Penalty Issued</span>' : 
                    r.status === 'resolved' ? 
                    '<span class="badge resolved">✅ Resolved</span>' : 
                    '<span class="badge pending">⏳ Pending</span>'
                }
            </td>
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
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = myPenalties.map(p => `
        <tr>
            <td>${escapeHtml(p.violation)}</td>
            <td>${escapeHtml(p.service_type || 'Community Service')}</td>
            <td>${p.hours} hrs</td>
            <td>
                <span class="status-badge status-${p.status}">
                    ${getStatusIcon(p.status)} ${p.status}
                </span>
            </td>
            <td>${formatDate(p.deadline)}</td>
        </tr>
    `).join('')
}

// ============ RENDER ACTIVITY FEED ============

function renderActivityFeed() {
    const container = document.getElementById('activityContainer')
    if (!container) return

    const activities = []

    // Add report activities
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

    // Add penalty activities
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
    await loadMyReports()
    await loadMyPenalties()
    updateStats()
    renderReportsTable()
    renderPenaltiesTable()
    renderActivityFeed()
    renderDeadlines()
}

// ============ DRAWER FUNCTIONS ============

function openDrawer() {
    document.getElementById('overlay')?.classList.add('open')
    document.getElementById('drawer')?.classList.add('open')
}

function closeDrawer() {
    document.getElementById('overlay')?.classList.remove('open')
    document.getElementById('drawer')?.classList.remove('open')
}

// ============ TAB SWITCHING ============

function switchTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active')
    })
    document.getElementById(`${tabName}-tab`)?.classList.add('active')
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active')
    })
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active')
}

// ============ DARK MODE TOGGLE ============

function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Create dark mode toggle button in topbar
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('darkModeToggle')) {
        const btn = document.createElement('button');
        btn.id = 'darkModeToggle';
        btn.className = 'icon-btn';
        
        const isDark = document.body.classList.contains('dark-mode');
        updateDarkModeIcon(btn, isDark);
        
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const nowDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
            updateDarkModeIcon(btn, nowDark);
        };
        
        topbarRight.insertBefore(btn, topbarRight.firstChild);
    }
}

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
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
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

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth()
    if (!isAuth) return
    
    loadStudentInfo()
    await refreshDashboard()
    initDarkMode() // Initialize dark mode
    
    // Drawer event listeners
    document.getElementById('hamburger')?.addEventListener('click', openDrawer)
    document.getElementById('drawerClose')?.addEventListener('click', closeDrawer)
    document.getElementById('overlay')?.addEventListener('click', closeDrawer)
    
    // Tab switching
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const tab = link.getAttribute('data-tab')
            if (tab) switchTab(tab)
        })
    })
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut()
        localStorage.removeItem('currentStudent')
        window.location.href = '/index.html'
    })
})

// ============ GLOBAL FUNCTIONS ============
window.viewPenalties = () => switchTab('penalties')
window.viewHistory = () => switchTab('reports')
window.handleSubmitAppeal = () => {
    alert('Appeal feature coming soon. Please contact the Discipline Office.')
}