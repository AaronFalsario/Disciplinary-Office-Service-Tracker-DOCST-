import { initAdminDrawer } from '/Assets/drawer-admin.js';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize drawer
initAdminDrawer();

let penaltiesData = [];
let studentsData = [];
let adminsData = [];
let trendChart = null;
let categoryChart = null;
let statusChart = null;

// ============ LOAD ALL DATA FROM SUPABASE ============
async function loadData() {
    try {
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
        
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Failed to load data', 'error');
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
    
    // Count penalties per student
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
    
    showAlert('CSV exported successfully!', 'success');
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
    
    showAlert('Full report generated successfully!', 'success');
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
    
    showAlert(`${type} report downloaded!`, 'success');
};

// Show alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed; top: 80px; right: 20px; padding: 12px 20px;
        border-radius: 8px; font-size: 13px; font-weight: 500;
        z-index: 10000; background: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white; animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Dark mode
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
    });
}

// Add animation style
if (!document.querySelector('#alert-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize
async function init() {
    console.log('Initializing Reports Page...');
    initDarkMode();
    await loadData();
    
    document.getElementById('refreshBtn')?.addEventListener('click', loadData);
    document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('yearFilter')?.addEventListener('change', updateAnalytics);
    document.getElementById('monthFilter')?.addEventListener('change', updateAnalytics);
}

init();