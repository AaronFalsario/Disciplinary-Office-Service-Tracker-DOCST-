import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)

// basta
let currentStudent = JSON.parse(localStorage.getItem('currentStudent'))

// eto for security
if (!currentStudent) {
    window.location.href = '/Assets/Student Authentication/Student.html'
}

// ETO LOAD STUDENT INFO
function loadStudentInfo() {
    if (!currentStudent) return

    document.getElementById('studentName').textContent = currentStudent.name
    document.getElementById('studentId').textContent = `ID: ${currentStudent.studentId}`

    const hour = new Date().getHours()
    let greeting = 'Hello'

    if (hour < 12) greeting = 'Good morning'
    else if (hour < 18) greeting = 'Good afternoon'
    else greeting = 'Good evening'

    document.getElementById('welcomeMessage').textContent =
        `${greeting}, ${currentStudent.name} 👋`

    document.getElementById('currentDate').textContent =
        new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
}

// penalties sya na manggagaling sa database kaso wala pa tayo table for penalties wahaha
function loadMyPenalties() {
    const key = `penalties_${currentStudent.studentId}`
    return JSON.parse(localStorage.getItem(key)) || []
}

function saveMyPenalties(penalties) {
    const key = `penalties_${currentStudent.studentId}`
    localStorage.setItem(key, JSON.stringify(penalties))
}

// eto yung sa stats
function updateStats(penalties) {
    const pending = penalties.filter(p => p.status !== 'completed').length
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)

    const totalViolations = penalties.length

    const totalHours = penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    const complianceRate = totalHours ? Math.round((completedHours / totalHours) * 100) : 100

    document.getElementById('pendingPenalties').textContent = pending
    document.getElementById('completedHours').textContent = completedHours
    document.getElementById('totalViolations').textContent = totalViolations
    document.getElementById('complianceRate').textContent = `${complianceRate}%`
}

// eto for the table
function renderPenaltiesTable(penalties) {
    const tbody = document.getElementById('penaltiesTableBody')
    if (!tbody) return

    if (!penalties.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div>No penalty records found</div>
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = penalties.map(p => `
        <tr>
            <td>${escapeHtml(p.violation)}</td>
            <td>${escapeHtml(p.serviceType)}</td>
            <td>${p.hours} hrs</td>
            <td>${p.status}</td>
            <td>${formatDate(p.deadline)}</td>
        </tr>
    `).join('')
}

// activity tab to
function renderActivityFeed(penalties) {
    const container = document.getElementById('activityContainer')
    if (!container) return

    const activities = []

    penalties.forEach(p => {
        if (p.dateCreated) {
            activities.push({
                text: `Penalty issued: ${p.violation}`,
                time: new Date(p.dateCreated),
                icon: '⚠️'
            })
        }
        if (p.status === 'completed' && p.dateCompleted) {
            activities.push({
                text: `Completed ${p.hours} hrs for ${p.violation}`,
                time: new Date(p.dateCompleted),
                icon: '✓'
            })
        }
    })

    activities.sort((a, b) => b.time - a.time)

    if (!activities.length) {
        container.innerHTML = `<div class="empty-state">No recent activity</div>`
        return
    }

    container.innerHTML = activities.slice(0, 5).map(a => `
        <div class="activity-item">
            <div>${a.icon}</div>
            <div>
                <div>${escapeHtml(a.text)}</div>
                <small>${formatRelativeTime(a.time)}</small>
            </div>
        </div>
    `).join('')
}

// eto yung sa deadlines tab
function renderDeadlines(penalties) {
    const container = document.getElementById('deadlinesContainer')
    if (!container) return

    const upcoming = penalties
        .filter(p => p.status !== 'completed' && p.deadline)
        .slice(0, 5)

    if (!upcoming.length) {
        container.innerHTML = `<div class="empty-state">No upcoming deadlines</div>`
        return
    }

    container.innerHTML = upcoming.map(p => `
        <div class="deadline-item">
            <div>${escapeHtml(p.violation)}</div>
            <div>${formatDate(p.deadline)}</div>
        </div>
    `).join('')
}

// Helpers nalang tawag ko dito
function formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
}

function formatRelativeTime(date) {
    const diff = Date.now() - date
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    if (hrs < 24) return `${hrs} hr ago`
    return `${days} day ago`
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text || ''
    return div.innerHTML
}

// Eto sa Dashboard tab
function refreshDashboard() {
    const penalties = loadMyPenalties()
    updateStats(penalties)
    renderPenaltiesTable(penalties)
    renderActivityFeed(penalties)
    renderDeadlines(penalties)
}

// Mga DRAWER to
function openDrawer() {
    document.getElementById('overlay')?.classList.add('open')
    document.getElementById('drawer')?.classList.add('open')
}

function closeDrawer() {
    document.getElementById('overlay')?.classList.remove('open')
    document.getElementById('drawer')?.classList.remove('open')
}

// ETO INIT
document.addEventListener('DOMContentLoaded', () => {
    loadStudentInfo()
    refreshDashboard()

    document.getElementById('hamburger')?.addEventListener('click', openDrawer)
    document.getElementById('drawerClose')?.addEventListener('click', closeDrawer)
    document.getElementById('overlay')?.addEventListener('click', closeDrawer)

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut()
        localStorage.removeItem('currentStudent')
        window.location.href = '/index.html'
    })
})

// GLOBAL TO
window.viewPenalties = () => alert('View penalties')
window.viewHistory = () => alert('View history')
window.handleSubmitAppeal = () => alert('Submit appeal coming soon')