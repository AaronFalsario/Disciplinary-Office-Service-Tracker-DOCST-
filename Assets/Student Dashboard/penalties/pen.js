//STUDENT PENALTIES PAGE 
        let currentStudent = null;
        let myPenalties = [];
//load students
function loadCurrentStudent() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        currentStudent = JSON.parse(stored);
        
        // Update drawer with student info
        const nameEl = document.getElementById('studentName');
        const idEl = document.getElementById('studentId');
        
        if (nameEl) nameEl.textContent = currentStudent.name || 'Student';
        if (idEl) idEl.textContent = `ID: ${currentStudent.studentId || currentStudent.id || '---'}`;
        return true;
    } else {
        // NO DEMO - redirect to login
        window.location.href = '/Assets/Student Authentication/Student.html';
        return false;
    }
}

        // Load only current student's penalties
        function loadMyPenalties() {
            const studentId = currentStudent?.studentId || currentStudent?.id;
            const storageKey = `penalties_${studentId}`;
            const stored = localStorage.getItem(storageKey);
            
            if (stored) {
                myPenalties = JSON.parse(stored);
            } else {
                // Empty penalties for new student
                myPenalties = [];
                saveMyPenalties();
            }
            return myPenalties;
        }

        // Save penalties
        function saveMyPenalties() {
            const studentId = currentStudent?.studentId || currentStudent?.id;
            const storageKey = `penalties_${studentId}`;
            localStorage.setItem(storageKey, JSON.stringify(myPenalties));
        }

        // Update statistics
        function updateStats() {
            const totalViolations = myPenalties.length;
            const pending = myPenalties.filter(p => p.status !== 'completed').length;
            const completedHours = myPenalties
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
            const totalHours = myPenalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
            const complianceRate = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 100;
            
            document.getElementById('pendingPenalties').textContent = pending;
            document.getElementById('completedHours').textContent = completedHours;
            document.getElementById('totalViolations').textContent = totalViolations;
            document.getElementById('complianceRate').textContent = `${complianceRate}%`;
        }

        // Format date
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        // Render penalties table
        function renderPenaltiesTable() {
            const tbody = document.getElementById('penaltiesTableBody');
            if (!tbody) return;
            
            if (myPenalties.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <div class="empty-icon">✅</div>
                            <div class="empty-title">No Penalty Records</div>
                            <div class="empty-sub">You have no violations recorded. Great job! 🎉</div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = myPenalties.map(penalty => {
                let statusClass = 'status-pending';
                let statusText = 'Pending';
                
                if (penalty.status === 'completed') {
                    statusClass = 'status-completed';
                    statusText = 'Completed';
                } else if (penalty.status === 'in-progress') {
                    statusClass = 'status-in-progress';
                    statusText = 'In Progress';
                }
                
                return `
                    <tr>
                        <td><strong>${escapeHtml(penalty.violation)}</strong></td>
                        <td>${escapeHtml(penalty.serviceType)}</td>
                        <td>${penalty.hours} hrs</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${formatDate(penalty.deadline)}</td>
                    </tr>
                `;
            }).join('');
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Drawer Functions
// Drawer Functions
function initializeDrawer() {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    const adminPill = document.getElementById('adminPill');
    
    // Function to open drawer (for mobile)
    function openDrawer() {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    // Function to close drawer (for mobile)
    function closeDrawer() {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
    
    // Check screen width on load and resize
    function checkScreenSize() {
        if (window.innerWidth > 768) {
            // Desktop: Drawer is ALWAYS visible
            drawer.classList.remove('open');  // Remove 'open' class
            overlay.classList.remove('open'); // Hide overlay
            document.body.style.overflow = ''; // Reset scroll
        } else {
            // Mobile: Drawer starts hidden
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        }
    }
    
    // Add event listeners for mobile only
    if (window.innerWidth <= 768) {
        if (hamburger) hamburger.addEventListener('click', openDrawer);
        if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);
        if (adminPill) adminPill.addEventListener('click', openDrawer);
    }
    
    // Listen for window resize to adjust behavior
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // Desktop mode
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            // Remove mobile event listeners to prevent conflicts
            if (hamburger) hamburger.removeEventListener('click', openDrawer);
            if (drawerClose) drawerClose.removeEventListener('click', closeDrawer);
            if (overlay) overlay.removeEventListener('click', closeDrawer);
            if (adminPill) adminPill.removeEventListener('click', openDrawer);
        } else {
            // Mobile mode
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            // Add mobile event listeners
            if (hamburger) hamburger.addEventListener('click', openDrawer);
            if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
            if (overlay) overlay.addEventListener('click', closeDrawer);
            if (adminPill) adminPill.addEventListener('click', openDrawer);
        }
    });
    
    // Close drawer on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.innerWidth <= 768) {
                closeDrawer();
            }
        }
    });
    
    // Expose functions globally
    window.openDrawer = openDrawer;
    window.closeDrawer = closeDrawer;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeDrawer);
        // Handle logout
        function handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('currentStudent');
                showNotification('Logged out successfully');
                setTimeout(() => {
                    window.location.href = '/Assets/Student Authentication/Student.html';
                }, 1000);
            }
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: var(--blue);
                color: white;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }

        // Initialize page
        function init() {
            if (!loadCurrentStudent()) return;
            initializeDrawer();
            loadMyPenalties();
            updateStats();
            renderPenaltiesTable();
            
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
            
            const adminPill = document.getElementById('adminPill');
            if (adminPill) adminPill.addEventListener('click', window.openDrawer);
        }

        document.addEventListener('DOMContentLoaded', init);
        
        window.handleLogout = handleLogout;
        window.openDrawer = openDrawer;
        window.closeDrawer = closeDrawer;