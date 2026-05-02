// funct.js - Connected to Supabase (NO SAMPLE DATA)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ DRAWER FUNCTIONALITY ============
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const adminPill = document.getElementById('adminPill');

function openDrawer() {
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
    document.body.style.overflow = '';
}

if (window.innerWidth <= 768) {
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (adminPill) adminPill.addEventListener('click', openDrawer);
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeDrawer();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
});

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
        const adminName = document.getElementById('adminName')?.textContent || 'Administrator';
        welcomeTitle.textContent = `${greeting}, ${adminName} 👋`;
    }
}

// ============ LOAD ADMIN NAME FROM SUPABASE ============
async function loadAdminName() {
    try {
        console.log('🔍 Loading admin name...');
        
        // First, try to get from localStorage (faster)
        const storedAdmin = localStorage.getItem('currentAdmin');
        if (storedAdmin) {
            try {
                const admin = JSON.parse(storedAdmin);
                const adminName = admin.full_name || admin.name;
                if (adminName) {
                    const adminNameEl = document.getElementById('adminName');
                    if (adminNameEl) {
                        adminNameEl.textContent = adminName;
                        console.log('✅ Admin name loaded from localStorage:', adminName);
                        updateGreeting();
                        return;
                    }
                }
            } catch(e) {}
        }
        
        // If not in localStorage, get from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
            console.error('❌ Auth error:', userError);
            return;
        }
        
        if (!user) {
            console.log('⚠️ No user logged in');
            return;
        }
        
        console.log('✅ User found:', user.email);
        
        // Try to get admin from admins table
        let adminData = null;
        let adminError = null;
        
        // Try with 'full_name' column first
        const { data: data1, error: err1 } = await supabase
            .from('admins')
            .select('*')
            .eq('email', user.email)
            .single();
        
        adminData = data1;
        adminError = err1;
        
        if (adminError) {
            console.error('❌ Admin query error:', adminError);
            
            // Try alternative approach - maybe the table is called 'admin' or has different column
            const { data: data2, error: err2 } = await supabase
                .from('admin')
                .select('*')
                .eq('email', user.email)
                .single();
            
            if (!err2 && data2) {
                adminData = data2;
                adminError = null;
            }
        }
        
        if (adminError || !adminData) {
            console.log('⚠️ Admin not found in database, using email as name');
            // Fallback: use email prefix as name
            const emailName = user.email.split('@')[0];
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl) {
                adminNameEl.textContent = emailName;
                updateGreeting();
            }
            return;
        }
        
        // Get the admin name (try different possible column names)
        const adminName = adminData.full_name || adminData.name || adminData.admin_name || user.email.split('@')[0];
        
        console.log('✅ Admin name found:', adminName);
        
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = adminName;
            console.log('✅ Admin name element updated');
        } else {
            console.error('❌ adminName element not found in DOM');
        }
        
        // Save to localStorage for faster loading next time
        localStorage.setItem('currentAdmin', JSON.stringify({ full_name: adminName, email: user.email }));
        
        updateGreeting();
        
    } catch (error) {
        console.error('❌ Error loading admin name:', error);
        // Fallback: try to get from localStorage one more time
        const stored = localStorage.getItem('currentAdmin');
        if (stored) {
            try {
                const admin = JSON.parse(stored);
                const adminName = admin.full_name || admin.name;
                const adminNameEl = document.getElementById('adminName');
                if (adminNameEl && adminName) {
                    adminNameEl.textContent = adminName;
                    updateGreeting();
                }
            } catch(e) {}
        }
    }
}

// ============ DATA STORES ============
let students = [];
let penalties = [];

// ============ LOAD STUDENTS FROM SUPABASE (NO SAMPLE DATA) ============
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, email, created_at');
        
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

// ============ LOAD PENALTIES FROM SUPABASE (NO SAMPLE DATA) ============
async function loadPenalties() {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // NO SAMPLE DATA - ONLY REAL DATA FROM DATABASE
        penalties = (data || []).map(p => ({
            id: p.id,
            studentId: p.student_id,
            violation: p.violation,
            serviceType: p.service_type || 'Community Service',
            hours: p.hours,
            status: p.status || 'pending',
            deadline: p.deadline,
            dateCreated: p.created_at
        }));
        
        console.log('Penalties loaded from database:', penalties.length);
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
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentPenalties.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.studentId)}</strong></td>
            <td>${escapeHtml(p.violation)}</span></td>
            <td>${p.hours} hrs</span></td>
            <td><span class="status-badge status-${p.status === 'in-progress' ? 'progress' : p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status}</span></span></td>
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
        if (penalty.dateCreated) {
            activities.push({
                text: `Penalty issued to ${penalty.studentId} for ${penalty.violation}`,
                time: new Date(penalty.dateCreated),
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
        if (penalty.dateCreated) {
            const date = new Date(penalty.dateCreated);
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

// ============ CLEAR LOCALSTORAGE (Remove sample data) ============
localStorage.removeItem('campus_care_penalties');
localStorage.removeItem('campus_care_reports');

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
    console.log(`✅ Dashboard updated: ${students.length} students, ${penalties.length} penalties (REAL DATA ONLY)`);
}

// ============ LOGOUT ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.href = '/Assets/Landing/index.html';
        }
    });
}

// ============ NOTIFICATION BUTTON ============
const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        alert('🔔 No new notifications at this time.');
    });
}

// ============ FORCE SET ADMIN NAME (FALLBACK) ============
// This ensures the admin name is set even if database query fails
function forceSetAdminName() {
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl && (!adminNameEl.textContent || adminNameEl.textContent === 'Administrator')) {
        // Try to get from localStorage one more time
        const stored = localStorage.getItem('currentAdmin');
        if (stored) {
            try {
                const admin = JSON.parse(stored);
                const name = admin.full_name || admin.name;
                if (name) {
                    adminNameEl.textContent = name;
                    updateGreeting();
                    return;
                }
            } catch(e) {}
        }
    }
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Admin Dashboard...');
    await loadAdminName();
    forceSetAdminName();
    await refreshDashboard();
    
    // Refresh every 30 seconds
    setInterval(refreshDashboard, 30000);
}

// Dark Mode - Add this at the END of your funct.js file

// Check saved preference
const savedDarkMode = localStorage.getItem('docst_dark_mode');
if (savedDarkMode === 'enabled') {
    document.body.classList.add('dark-mode');
}

// Create dark mode toggle button (adds to topbar)
function addDarkModeToggle() {
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('darkModeToggle')) {
        const btn = document.createElement('button');
        btn.id = 'darkModeToggle';
        btn.innerHTML = '🌙';
        btn.style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            margin-right: 10px;
            padding: 5px 10px;
            border-radius: 20px;
        `;
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            btn.innerHTML = isDark ? '☀️' : '🌙';
        };
        topbarRight.insertBefore(btn, topbarRight.firstChild);
    }
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', addDarkModeToggle);

// Start the application
init();

// ============ EXPORT SUPABASE ============
export { supabase };