const chartScript = document.createElement('script');
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
chartScript.onload = () => {
    console.log('✅ Chart.js loaded successfully');
    if (typeof updateChart === 'function') {
        setTimeout(() => updateChart(), 100);
    }
};
document.head.appendChild(chartScript);

import { createClient } from '@supabase/supabase-js'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ ADMIN AUTH CHECK ============
async function checkAdminAuth() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('No session found - unauthorized access');
            redirectToUnauthorized();
            return false;
        }
        
        const userEmail = session.user.email;
        console.log('Checking admin access for:', userEmail);
        
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('id, admin_id, full_name, email, role, status')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (adminError || !adminData) {
            console.log('User is not an admin - access denied');
            redirectToUnauthorized();
            return false;
        }
        
        if (adminData.status !== 'active') {
            console.log('Admin account is inactive');
            redirectToUnauthorized();
            return false;
        }
        
        console.log('✅ Admin authorized:', adminData.full_name);
        
        // Store admin info
        localStorage.setItem('currentAdmin', JSON.stringify({
            id: adminData.id,
            admin_id: adminData.admin_id,
            email: adminData.email,
            name: adminData.full_name,
            full_name: adminData.full_name,
            role: adminData.role,
            status: adminData.status
        }));
        
        // Setup the admin drawer with the admin info
        setupAdminDrawer(adminData.full_name, adminData.admin_id);
        setupAdminLogout('logoutBtn');
        setupAdminDrawerControls();
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToUnauthorized();
        return false;
    }
}

function redirectToUnauthorized() {
    showUnauthorizedNotification();
    localStorage.removeItem('currentAdmin');
    
    setTimeout(() => {
        window.location.href = '/Assets/Landing/index.html';
    }, 2000);
}

function showUnauthorizedNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #DC2626;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            text-align: center;
            min-width: 300px;
        ">
            <div style="margin-bottom: 8px;">⚠️ Unauthorized Access</div>
            <div style="font-size: 12px; opacity: 0.9;">Redirecting to landing page...</div>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// ============ SET CURRENT DATE ============
const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const currentDateEl = document.getElementById('currentDate');
if (currentDateEl) {
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', dateOptions);
}

// ============ GREETING BASED ON TIME ============
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
    if (hour >= 18) greeting = 'Good evening';
    
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) {
        const admin = getCurrentAdmin();
        const adminName = admin?.full_name || admin?.name || 'Administrator';
        welcomeTitle.textContent = `${greeting}, ${adminName} 👋`;
    }
}

// ============ LOAD ADMIN NAME ============
async function loadAdminName() {
    try {
        console.log('🔍 Loading admin name...');
        
        const storedAdmin = localStorage.getItem('currentAdmin');
        if (storedAdmin) {
            try {
                const admin = JSON.parse(storedAdmin);
                const adminName = admin.full_name || admin.name;
                if (adminName) {
                    updateGreeting();
                    console.log('✅ Admin name loaded from localStorage:', adminName);
                    return;
                }
            } catch(e) {}
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log('No user logged in');
            return;
        }
        
        console.log('✅ User found:', user.email);
        
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('full_name, email, role, status, admin_id')
            .eq('email', user.email)
            .maybeSingle();
        
        if (adminError || !adminData) {
            console.log('No admin record found');
            return;
        }
        
        const adminName = adminData.full_name || user.email.split('@')[0];
        console.log('✅ Admin name found:', adminName);
        
        localStorage.setItem('currentAdmin', JSON.stringify({ 
            full_name: adminName, 
            email: user.email,
            role: adminData.role,
            admin_id: adminData.admin_id,
            status: adminData.status
        }));
        
        updateGreeting();
        
    } catch (error) {
        console.error('❌ Error loading admin name:', error);
    }
}

// ============ DATA STORES ============
let students = [];
let penalties = [];

// ============ LOAD STUDENTS FROM SUPABASE ============
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*');
        
        if (error) throw error;
        students = data || [];
        console.log('Students loaded:', students.length);
        return students;
    } catch (error) {
        console.error('Error loading students:', error);
        students = [];
        return [];
    }
}

// ============ LOAD PENALTIES FROM SUPABASE ============
async function loadPenalties() {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        penalties = data || [];
        console.log('Penalties loaded:', penalties.length);
        return penalties;
    } catch (error) {
        console.error('Error loading penalties:', error);
        penalties = [];
        return [];
    }
}

// ============ UPDATE STATISTICS ============
function updateStats() {
    const totalStudents = students.length;
    const activePenalties = penalties.filter(p => p.status !== 'completed').length;
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const complianceRate = totalStudents > 0 ? Math.min(Math.round((completedHours / (totalStudents * 10)) * 100), 100) : 0;
    
    const totalStudentsEl = document.getElementById('totalStudents');
    const activePenaltiesEl = document.getElementById('activePenalties');
    const completedHoursEl = document.getElementById('completedHours');
    const complianceRateEl = document.getElementById('complianceRate');
    
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    if (activePenaltiesEl) activePenaltiesEl.textContent = activePenalties;
    if (completedHoursEl) completedHoursEl.textContent = completedHours;
    if (complianceRateEl) complianceRateEl.textContent = `${complianceRate}%`;
    
    console.log('Stats updated:', { totalStudents, activePenalties, completedHours, complianceRate });
}

// ============ UPDATE RECENT PENALTIES TABLE ============
function updateRecentPenalties() {
    const tbody = document.getElementById('recentPenaltiesBody');
    if (!tbody) return;
    
    const recentPenalties = [...penalties].slice(0, 5);
    
    if (recentPenalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div>No penalty records found</div>
                </div>
                </span>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentPenalties.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(p.violation)}</span></td>
            <td>${p.hours || 0} hrs</span></td>
            <td><span class="status-badge status-${p.status === 'in-progress' ? 'progress' : p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status || 'pending'}</span></span></td>
            <td>${formatDate(p.deadline)}</span></td>
        </tr>
    `).join('');
}

// ============ UPDATE TOP VIOLATIONS ============
function updateTopViolations() {
    const container = document.getElementById('violationsContainer');
    if (!container) return;
    
    const violationCount = {};
    penalties.forEach(p => {
        if (p.violation) {
            violationCount[p.violation] = (violationCount[p.violation] || 0) + 1;
        }
    });
    
    const topViolations = Object.entries(violationCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (topViolations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div>No violations recorded yet</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topViolations.map(([name, count]) => `
        <div class="violation-item">
            <span class="violation-name">${escapeHtml(name)}</span>
            <span class="violation-count">${count} cases</span>
        </div>
    `).join('');
}

// ============ UPDATE ACTIVITY FEED ============
function updateActivityFeed() {
    const container = document.getElementById('activityContainer');
    if (!container) return;
    
    const activities = [];
    
    students.forEach(student => {
        if (student.created_at) {
            activities.push({
                text: `New student registered: ${student.name}`,
                time: new Date(student.created_at),
                icon: '👨‍🎓'
            });
        }
    });
    
    penalties.forEach(penalty => {
        if (penalty.created_at) {
            activities.push({
                text: `Penalty issued to ${penalty.student_id} for ${penalty.violation}`,
                time: new Date(penalty.created_at),
                icon: '⚠️'
            });
        }
    });
    
    activities.sort((a, b) => b.time - a.time);
    const recentActivities = activities.slice(0, 5);
    
    if (recentActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div>No recent activity</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentActivities.map(a => `
        <div class="activity-item">
            <div class="activity-icon">${a.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${escapeHtml(a.text)}</div>
                <div class="activity-time">${formatRelativeTime(a.time)}</div>
            </div>
        </div>
    `).join('');
}

// ============ UPDATE CHART ============
let penaltyChart;

function updateChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        last6Months.push(months[d.getMonth()] + ' ' + d.getFullYear());
    }
    
    const monthlyCounts = last6Months.map(() => 0);
    
    penalties.forEach(penalty => {
        if (penalty.created_at) {
            const date = new Date(penalty.created_at);
            const monthYear = months[date.getMonth()] + ' ' + date.getFullYear();
            const index = last6Months.indexOf(monthYear);
            if (index !== -1) {
                monthlyCounts[index]++;
            }
        }
    });
    
    const ctx = document.getElementById('penaltyChart')?.getContext('2d');
    if (!ctx) return;
    
    if (penaltyChart) penaltyChart.destroy();
    
    penaltyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months,
            datasets: [{
                label: 'Penalties Issued',
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
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ============ HELPER FUNCTIONS ============
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ REFRESH ALL DASHBOARD DATA ============
async function refreshDashboard() {
    console.log('🔄 Refreshing dashboard data from Supabase...');
    await loadStudents();
    await loadPenalties();
    updateStats();
    updateRecentPenalties();
    updateTopViolations();
    updateActivityFeed();
    updateChart();
    console.log(`✅ Dashboard updated: ${students.length} students, ${penalties.length} penalties`);
}

// ============ DARK MODE ============
function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
}

function setupDarkModeToggle() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (!darkModeBtn) return;
    
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

function updateDarkModeIcon(btn, isDark) {
    if (!btn) return;
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

// Add fadeInOut animation
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

// ============ NOTIFICATION BUTTON ============
const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        alert('🔔 No new notifications at this time.');
    });
}

// ============ INITIALIZE ============
async function init() {
    console.log('🔐 Checking admin authentication...');
    
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) {
        return;
    }
    
    console.log('Initializing Admin Dashboard...');
    initDarkMode();
    setupDarkModeToggle();
    await loadAdminName();
    await refreshDashboard();
    
    setInterval(refreshDashboard, 90000);
}

init();

export { supabase };