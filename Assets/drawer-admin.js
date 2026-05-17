// ============ DOCST ADMIN DRAWER - MASTER FILE ============
// Apply dark mode INSTANTLY before anything renders (prevents flash)
if (localStorage.getItem('docst_dark_mode') === 'enabled') {
    document.documentElement.classList.add('dark-mode');
    document.body?.classList.add('dark-mode');
}

const adminNavItems = [
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', 
        label: 'Dashboard', 
        href: '/Assets/Admin-dashboard/Admin.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 
        label: 'Users', 
        href: '/Assets/Admin-dashboard/students/record.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>', 
        label: 'Penalties', 
        href: '/Assets/Admin-dashboard/penalties/student.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>', 
        label: 'Appeals', 
        href: '/Assets/Admin-dashboard/appeal/appeal.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', 
        label: 'Reports', 
        href: '/Assets/Admin-dashboard/report/report.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>', 
        label: 'Settings', 
        href: '/Assets/Admin-dashboard/settings/setting.html'
    }
];

// ============ ACTIVE PAGE DETECTION ============
function getActiveAdminLabel() {
    const path = window.location.pathname;
    console.log('Current path:', path); // Debug log
    
    if (path.includes('Admin.html') || path.endsWith('/Admin dashboard/')) return 'Dashboard';
    if (path.includes('record.html')) return 'Users';
    if (path.includes('penalties') && path.includes('student.html')) return 'Penalties';
    if (path.includes('student.html') && path.includes('penalties')) return 'Penalties';
    // Fix: Detect Appeals page - check for appeal in the path
    if (path.includes('appeal') || path.includes('appeal.html') || path.includes('/appeal/')) return 'Appeals';
    if (path.includes('report.html')) return 'Reports';
    if (path.includes('setting.html')) return 'Settings';
    
    return '';
}

// ============ HELPER: Format Admin ID ============
function formatAdminId(adminId) {
    if (!adminId) return 'ADMIN';
    if (adminId.includes('-') || adminId.length > 20) {
        const stored = localStorage.getItem('currentAdmin');
        if (stored) {
            try {
                const admin = JSON.parse(stored);
                if (admin.admin_id && admin.admin_id !== admin.id) {
                    return admin.admin_id;
                }
                if (admin.email) {
                    return admin.email.split('@')[0].toUpperCase();
                }
            } catch(e) {}
        }
        return adminId.substring(0, 8).toUpperCase();
    }
    return adminId;
}

// ============ SETUP ADMIN DRAWER ============
function setupAdminDrawer(adminName, adminId) {
    const drawerNav = document.getElementById('drawerNavMain');
    if (!drawerNav) {
        console.error('drawerNavMain not found!');
        return false;
    }

    const activeLabel = getActiveAdminLabel();
    console.log('Active label:', activeLabel); // Debug log
    drawerNav.innerHTML = '';

    adminNavItems.forEach((item, index) => {
        const isActive = item.label === activeLabel;
        const button = document.createElement('button');
        button.className = `drawer-item${isActive ? ' active' : ''}`;
        button.innerHTML = `${item.icon} <span>${item.label}</span>`;

        button.addEventListener('click', () => {
            window.location.href = item.href;
        });

        drawerNav.appendChild(button);

        // Add divider after Penalties
        if (item.label === 'Penalties') {
            const divider = document.createElement('hr');
            divider.className = 'drawer-divider';
            drawerNav.appendChild(divider);
        }
    });

    const drawerNameEl = document.getElementById('drawerAdminName');
    const drawerIdEl = document.getElementById('drawerAdminId');
    const avatarInitials = document.getElementById('avatarInitials');

    if (drawerNameEl) drawerNameEl.textContent = adminName || 'Administrator';
    if (drawerIdEl) drawerIdEl.textContent = formatAdminId(adminId);
    if (avatarInitials && adminName) {
        avatarInitials.textContent = getAdminInitials(adminName);
    }
    
    return true;
}

function getAdminInitials(fullName) {
    if (!fullName || fullName === 'Administrator') return 'AD';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCurrentAdmin() {
    try {
        const stored = localStorage.getItem('currentAdmin');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

// ============ LOGOUT TOAST FUNCTIONS ============
let logoutToastContainer = null;

function getLogoutToastContainer() {
    if (!logoutToastContainer) {
        logoutToastContainer = document.querySelector('.logout-toast-container');
        if (!logoutToastContainer) {
            logoutToastContainer = document.createElement('div');
            logoutToastContainer.className = 'logout-toast-container';
            document.body.appendChild(logoutToastContainer);
        }
    }
    return logoutToastContainer;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLogoutToast(message, type = 'info', title = null) {
    const container = getLogoutToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `logout-toast logout-toast-${type}`;
    
    let iconHtml = '';
    let defaultTitle = '';
    
    switch(type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle"></i>';
            defaultTitle = 'Logged Out';
            break;
        case 'warning':
            iconHtml = '<i class="fas fa-sign-out-alt"></i>';
            defaultTitle = 'Goodbye';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle"></i>';
            defaultTitle = 'Error';
            break;
        default:
            iconHtml = '<i class="fas fa-info-circle"></i>';
            defaultTitle = 'Information';
    }
    
    const finalTitle = title || defaultTitle;
    
    toast.innerHTML = `
        <div class="logout-toast-icon">${iconHtml}</div>
        <div class="logout-toast-content">
            <div class="logout-toast-title">${escapeHtml(finalTitle)}</div>
            <div class="logout-toast-message">${escapeHtml(message)}</div>
        </div>
        <div class="logout-toast-progress"></div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('logout-toast-show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('logout-toast-show');
        toast.classList.add('logout-toast-hide');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
    
    return toast;
}

// ============ LOGOUT CONFIRMATION MODAL ============
function showLogoutConfirmation() {
    // Remove any existing modal
    const existingModal = document.querySelector('.logout-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'logout-modal';
    modal.innerHTML = `
        <div class="logout-modal-content">
            <div class="logout-modal-header">
                <i class="fas fa-sign-out-alt"></i>
                <h3>Confirm Logout</h3>
            </div>
            <div class="logout-modal-body">
                <p>Are you sure you want to logout?</p>
                <p class="logout-modal-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    You will need to login again to access the dashboard.
                </p>
            </div>
            <div class="logout-modal-footer">
                <button class="logout-modal-cancel">Cancel</button>
                <button class="logout-modal-confirm">Yes, Logout</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    const cancelBtn = modal.querySelector('.logout-modal-cancel');
    const confirmBtn = modal.querySelector('.logout-modal-confirm');
    
    cancelBtn.onclick = () => {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 300);
    };
    
    confirmBtn.onclick = async () => {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 300);
        await performLogout();
    };
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        }
    };
}

// ============ PERFORM LOGOUT ============
async function performLogout() {
    try {
        const admin = getCurrentAdmin();
        const adminName = admin?.full_name || admin?.name || admin?.fullName || 'User';
        
        // Show loading state on logout button if it exists
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            logoutBtn.disabled = true;
        }
        
        // Clear all stored data
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('hasSeenWelcomeNotification');
        sessionStorage.removeItem('lastSessionId');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Show beautiful logout toast
        showLogoutToast(
            `See you next time, ${adminName}! 👋`,
            'warning',
            'Logged Out Successfully'
        );
        
        // Redirect after toast is visible
        setTimeout(() => {
            window.location.href = '/Assets/Landing/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Logout error:', error);
        showLogoutToast(
            'Failed to logout. Please try again.',
            'error',
            'Logout Failed'
        );
        
        // Reset button state
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutBtn.disabled = false;
        }
    }
}

// ============ LOGOUT SETUP ============
function setupAdminLogout(logoutBtnId) {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (!logoutBtn) return;

    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogoutConfirmation();
    });
}

// ============ MOBILE DRAWER CONTROLS ============
function setupAdminDrawerControls() {
    const hamburger = document.getElementById('hamburger');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const drawerClose = document.getElementById('drawerClose');

    function openDrawer() {
        drawer?.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('drawer-open');
    }

    function closeDrawer() {
        drawer?.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.style.overflow = '';
        document.body.classList.remove('drawer-open');
    }

    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDrawer();
    });
}

// ============ INITIALIZE ============
function initAdminDrawer() {
    const currentAdmin = getCurrentAdmin();
    const adminName = currentAdmin?.name || currentAdmin?.full_name || currentAdmin?.fullName || 'Administrator';
    const adminId = currentAdmin?.admin_id || currentAdmin?.id || currentAdmin?.email || 'ADMIN';
    
    setupAdminDrawer(adminName, adminId);
    setupAdminLogout('logoutBtn');
    setupAdminDrawerControls();
}

// Export for module usage
export { 
    setupAdminDrawer, 
    setupAdminLogout, 
    setupAdminDrawerControls, 
    getCurrentAdmin,
    initAdminDrawer,
    formatAdminId,
    showLogoutConfirmation,
    performLogout,
    showLogoutToast
};