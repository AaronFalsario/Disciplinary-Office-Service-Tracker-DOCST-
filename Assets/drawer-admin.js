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
        href: '/Assets/Admin dashboard/Admin.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 
        label: 'Users', 
        href: '/Assets/Admin dashboard/students/record.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>', 
        label: 'Penalties', 
        href: '/Assets/Admin dashboard/penalties/student.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', 
        label: 'Reports', 
        href: '/Assets/Admin dashboard/report/report.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>', 
        label: 'Settings', 
        href: '/Assets/Admin dashboard/settings/setting.html'
    }
];

// ============ ACTIVE PAGE DETECTION ============
function getActiveAdminLabel() {
    const path = window.location.pathname;
    if (path.includes('Admin.html') || path.endsWith('/Admin dashboard/')) return 'Dashboard';
    if (path.includes('record.html')) return 'Users';
    if (path.includes('student.html') && path.includes('penalties')) return 'Penalties';
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

        if (item.label === 'Penalties' && index < adminNavItems.length - 1) {
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

// ============ LOGOUT ============
function setupAdminLogout(logoutBtnId) {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (!logoutBtn) return;

    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

    newBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to logout?')) return;
        
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('currentStudent');
        window.location.href = '/';
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

    hamburger?.addEventListener('click', openDrawer);
    drawerClose?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);

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
    formatAdminId
};