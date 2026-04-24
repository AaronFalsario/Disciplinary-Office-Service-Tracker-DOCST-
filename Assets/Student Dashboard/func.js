
let currentStudent = null;
function loadStudentData() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        currentStudent = JSON.parse(stored);
    } else {
        currentStudent = {
            id: "STU-2024-1001",
            name: "Juan Dela Cruz",
            studentId: "2024-1001",
            email: "juan.delacruz@gordoncollege.edu.ph",
            course: "BS Information Technology",
            year: 3
        };
    }
    updateStudentInfo();
}

// Update student info in the UI
function updateStudentInfo() {
    const nameEl = document.getElementById('studentName');
    const badgeEl = document.getElementById('studentId');
    const welcomeEl = document.getElementById('welcomeMessage');
    
    if (nameEl) nameEl.textContent = currentStudent?.name || 'Student';
    if (badgeEl) badgeEl.textContent = `ID: ${currentStudent?.studentId || '---'}`;
    
    if (welcomeEl) {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        if (hour >= 18) greeting = 'Good evening';
        welcomeEl.textContent = `${greeting}, ${currentStudent?.name || 'Student'} 👋`;
    }
    
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

//  Load Student's Own Penalties
function loadMyPenalties() {
    const storageKey = `penalties_${currentStudent?.studentId || currentStudent?.id}`;
    let penalties = localStorage.getItem(storageKey);
    
    if (!penalties) {
        // Initialize with empty array for new students
        penalties = [];
        localStorage.setItem(storageKey, JSON.stringify(penalties));
    } else {
        penalties = JSON.parse(penalties);
    }
    
    return penalties;
}

// Save Student's Penalties 
function saveMyPenalties(penalties) {
    const storageKey = `penalties_${currentStudent?.studentId || currentStudent?.id}`;
    localStorage.setItem(storageKey, JSON.stringify(penalties));
}

// Update Statistics
function updateStats(penalties) {
    const pending = penalties.filter(p => p.status !== 'completed').length;
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const totalViolations = penalties.length;
    
    // Calculate compliance rate based on completed hours vs total assigned hours
    const totalHours = penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const complianceRate = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 100;
    
    document.getElementById('pendingPenalties').textContent = pending;
    document.getElementById('completedHours').textContent = completedHours;
    document.getElementById('totalViolations').textContent = totalViolations;
    document.getElementById('complianceRate').textContent = Math.min(complianceRate, 100);
}

// Render Penalties Table 
function renderPenaltiesTable(penalties) {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">✅</div>
                    <div>No penalty records found</div>
                    <small style="color: var(--text-3);">You have no violations recorded</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = penalties.map(penalty => {
        let statusClass = 'status-pending';
        let statusText = 'Pending';
        
        if (penalty.status === 'completed') {
            statusClass = 'status-completed';
            statusText = 'Completed';
        } else if (penalty.status === 'in-progress') {
            statusClass = 'status-progress';
            statusText = 'In Progress';
        }
        
        return `
            <tr>
                <td>${escapeHtml(penalty.violation)}</td>
                <td>${escapeHtml(penalty.serviceType)}</td>
                <td>${penalty.hours} hrs</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${formatDate(penalty.deadline)}</td>
            </tr>
        `;
    }).join('');
}

// ========== Render Recent Activity ==========
function renderActivityFeed(penalties) {
    const container = document.getElementById('activityContainer');
    if (!container) return;
    
    const activities = [];
    
    // Add activities from penalties
    penalties.forEach(penalty => {
        if (penalty.dateCreated) {
            activities.push({
                text: `Penalty issued: ${penalty.violation}`,
                time: new Date(penalty.dateCreated),
                icon: '⚠️'
            });
        }
        if (penalty.status === 'completed' && penalty.dateCompleted) {
            activities.push({
                text: `Completed ${penalty.hours} hours of service for ${penalty.violation}`,
                time: new Date(penalty.dateCompleted),
                icon: '✓'
            });
        }
    });
    
    // Sort by most recent
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
    
    container.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${escapeHtml(activity.text)}</div>
                <div class="activity-time">${formatRelativeTime(activity.time)}</div>
            </div>
        </div>
    `).join('');
}

// ========== Render Upcoming Deadlines ==========
function renderDeadlines(penalties) {
    const container = document.getElementById('deadlinesContainer');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingDeadlines = penalties
        .filter(p => p.status !== 'completed' && p.deadline)
        .map(p => ({
            ...p,
            deadlineDate: new Date(p.deadline)
        }))
        .sort((a, b) => a.deadlineDate - b.deadlineDate)
        .slice(0, 5);
    
    if (upcomingDeadlines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div>No upcoming deadlines</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingDeadlines.map(deadline => {
        const daysLeft = Math.ceil((deadline.deadlineDate - today) / (1000 * 60 * 60 * 24));
        let dateClass = '';
        if (daysLeft < 0) dateClass = 'urgent';
        else if (daysLeft <= 3) dateClass = 'urgent';
        
        return `
            <div class="deadline-item">
                <div class="deadline-info">
                    <h4>${escapeHtml(deadline.violation)}</h4>
                    <p>${escapeHtml(deadline.serviceType)} · ${deadline.hours} hours</p>
                </div>
                <div class="deadline-date ${dateClass}">
                    ${formatDate(deadline.deadline)}
                </div>
            </div>
        `;
    }).join('');
}

// ========== Helper Functions ==========
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== Add New Penalty (Admin only - but function exists) ==========
function addPenalty(penaltyData) {
    let penalties = loadMyPenalties();
    const newPenalty = {
        id: Date.now(),
        ...penaltyData,
        dateCreated: new Date().toISOString()
    };
    penalties.push(newPenalty);
    saveMyPenalties(penalties);
    refreshDashboard();
}

// ========== Update Penalty Status ==========
function updatePenaltyStatus(penaltyId, newStatus) {
    let penalties = loadMyPenalties();
    const index = penalties.findIndex(p => p.id === penaltyId);
    if (index !== -1) {
        penalties[index].status = newStatus;
        if (newStatus === 'completed') {
            penalties[index].dateCompleted = new Date().toISOString();
        }
        saveMyPenalties(penalties);
        refreshDashboard();
    }
}

// Delete Penalty 
function deletePenalty(penaltyId) {
    let penalties = loadMyPenalties();
    penalties = penalties.filter(p => p.id !== penaltyId);
    saveMyPenalties(penalties);
    refreshDashboard();
}

//  Submit Appeal 
function submitAppeal(penaltyId, appealMessage) {
    let penalties = loadMyPenalties();
    const penalty = penalties.find(p => p.id === penaltyId);
    if (penalty) {
        // Store appeal in localStorage
        const appealsKey = `appeals_${currentStudent?.studentId}`;
        let appeals = JSON.parse(localStorage.getItem(appealsKey) || '[]');
        appeals.push({
            penaltyId: penaltyId,
            violation: penalty.violation,
            message: appealMessage,
            dateSubmitted: new Date().toISOString(),
            status: 'pending'
        });
        localStorage.setItem(appealsKey, JSON.stringify(appeals));
        alert('Appeal submitted successfully!');
    }
}

// Refresh Dashboard 
function refreshDashboard() {
    const penalties = loadMyPenalties();
    updateStats(penalties);
    renderPenaltiesTable(penalties);
    renderActivityFeed(penalties);
    renderDeadlines(penalties);
}

//  Action Handlers
function viewPenalties() {
    const penalties = loadMyPenalties();
    const pending = penalties.filter(p => p.status !== 'completed');
    if (pending.length === 0) {
        alert('You have no pending penalties. Great job! ✅');
    } else {
        alert(`You have ${pending.length} pending penalty/penalties to complete.`);
    }
}

function viewHistory() {
    const penalties = loadMyPenalties();
    const completed = penalties.filter(p => p.status === 'completed');
    const totalHours = completed.reduce((sum, p) => sum + p.hours, 0);
    alert(`You have completed ${completed.length} penalty/penalties with a total of ${totalHours} service hours. 🎉`);
}

function handleSubmitAppeal() {
    const penalties = loadMyPenalties();
    const pendingPenalties = penalties.filter(p => p.status !== 'completed');
    
    if (pendingPenalties.length === 0) {
        alert('You have no pending penalties to appeal.');
        return;
    }
    
    let penaltyList = 'Select a penalty to appeal:\n\n';
    pendingPenalties.forEach((p, i) => {
        penaltyList += `${i + 1}. ${p.violation} (${p.hours} hours)\n`;
    });
    
    const choice = prompt(penaltyList + '\n\nEnter the number of the penalty:');
    if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < pendingPenalties.length) {
            const message = prompt('Enter your appeal message:');
            if (message) {
                submitAppeal(pendingPenalties[index].id, message);
            }
        } else {
            alert('Invalid selection.');
        }
    }
}

//Drawer Functions
function openDrawer() {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    if (overlay && drawer) {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeDrawer() {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    if (overlay && drawer) {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Logout 
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentStudent');
        window.location.href = '/Assets/Student Authentication/Student.html';
    }
}

// Initialize Dashboard 
function initDashboard() {
    loadStudentData();
    
    // Check if student is logged in
    if (!localStorage.getItem('currentStudent')) {
        console.log('Demo mode: Using sample student data');
    }
    
    // Setup drawer event listeners
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Setup action buttons
    const viewPenaltiesBtn = document.querySelector('.action-card:first-child');
    const viewHistoryBtn = document.querySelector('.action-card:nth-child(2)');
    const submitAppealBtn = document.querySelector('.action-card:nth-child(3)');
    
    if (viewPenaltiesBtn) viewPenaltiesBtn.onclick = viewPenalties;
    if (viewHistoryBtn) viewHistoryBtn.onclick = viewHistory;
    if (submitAppealBtn) submitAppealBtn.onclick = handleSubmitAppeal;
    
    // Handle window resize for drawer
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeDrawer();
        }
    });
    
    // Escape key to close drawer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    
    // Refresh dashboard
    refreshDashboard();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);

// ========== Expose functions globally (for debugging if needed) ==========
window.viewPenalties = viewPenalties;
window.viewHistory = viewHistory;
window.handleSubmitAppeal = handleSubmitAppeal;
window.handleLogout = handleLogout;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;